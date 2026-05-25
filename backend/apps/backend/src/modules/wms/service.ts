import { ContainerRegistrationKeys, MedusaService } from "@medusajs/framework/utils"
import { randomUUID } from "crypto"
import { StockPool } from "./models/stock-pool.model"
import { Movement } from "./models/movement.model"
import {
  DecrementStockInput,
  DecrementStockResult,
  IncrementStockInput,
  IncrementStockResult,
  StockSnapshot,
  WmsServiceInterface,
} from "./types"
import { WmsInsufficientStockError } from "./errors"

class WmsServiceBase extends MedusaService({
  StockPool,
  Movement,
}) {}

export class WmsService extends WmsServiceBase implements WmsServiceInterface {
  ping(): string {
    return "wms-ok"
  }

  async getStock(vendorId: string, variantId: string): Promise<StockSnapshot> {
    const rows = await this.listStockPools({ vendor_id: vendorId, variant_id: variantId })
    if (rows.length === 0) {
      return { on_hand: 0, reserved: 0, available: 0 }
    }
    const row: any = rows[0]
    const onHand = Number(row.on_hand_qty?.numeric ?? row.on_hand_qty ?? 0)
    const reserved = Number(row.reserved_qty?.numeric ?? row.reserved_qty ?? 0)
    return { on_hand: onHand, reserved, available: onHand - reserved }
  }

  async decrementStock(input: DecrementStockInput): Promise<DecrementStockResult> {
    if (input.qty <= 0) {
      throw new Error("qty must be positive")
    }

    const container: any = (this as any).__container__
    const pg: any =
      container?.[ContainerRegistrationKeys.PG_CONNECTION] ??
      container?.["__pg_connection__"]
    if (!pg) {
      throw new Error("PG connection not available in WMS container")
    }

    return await pg.transaction(async (trx: any) => {
      // 1) Ensure pool row exists (implicit 0/0 if missing).
      // The unique constraint is a partial unique INDEX with predicate
      // (deleted_at IS NULL), so ON CONFLICT must reference the same predicate.
      const newPoolId = `sp_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      await trx.raw(
        `INSERT INTO wms_stock_pool
           (id, vendor_id, variant_id, on_hand_qty, raw_on_hand_qty,
            reserved_qty, raw_reserved_qty, created_at, updated_at)
         VALUES (?, ?, ?, 0, '{"value":"0"}'::jsonb, 0, '{"value":"0"}'::jsonb, NOW(), NOW())
         ON CONFLICT (vendor_id, variant_id) WHERE deleted_at IS NULL DO NOTHING`,
        [newPoolId, input.vendor_id, input.variant_id],
      )

      // 2) Atomic conditional decrement. Postgres locks the row for the
      // duration of this UPDATE; the predicate (on_hand - reserved) >= qty
      // is evaluated against the locked snapshot, so concurrent UPDATEs
      // serialize and we can never over-sell.
      const upd = await trx.raw(
        `UPDATE wms_stock_pool
           SET on_hand_qty = on_hand_qty - ?::numeric,
               raw_on_hand_qty = jsonb_build_object('value', (on_hand_qty - ?::numeric)::text),
               last_movement_at = NOW(),
               updated_at = NOW()
         WHERE vendor_id = ? AND variant_id = ? AND deleted_at IS NULL
           AND (on_hand_qty - reserved_qty) >= ?::numeric
         RETURNING on_hand_qty::numeric AS new_on_hand`,
        [input.qty, input.qty, input.vendor_id, input.variant_id, input.qty],
      )
      const updRows = upd?.rows ?? upd
      if (!updRows || updRows.length === 0) {
        const sel = await trx.raw(
          `SELECT (on_hand_qty - reserved_qty)::numeric AS available
             FROM wms_stock_pool
            WHERE vendor_id = ? AND variant_id = ? AND deleted_at IS NULL`,
          [input.vendor_id, input.variant_id],
        )
        const selRows = sel?.rows ?? sel
        const available =
          selRows && selRows.length ? Number(selRows[0].available) : 0
        throw new WmsInsufficientStockError(
          input.vendor_id,
          input.variant_id,
          input.qty,
          available,
        )
      }
      const newOnHand = Number(updRows[0].new_on_hand)

      // 3) Append-only audit row
      const movementId = `mv_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      await trx.raw(
        `INSERT INTO wms_movement
           (id, vendor_id, variant_id, type, qty_delta, raw_qty_delta,
            source_id, actor_id, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?::numeric,
                 jsonb_build_object('value', ?::text),
                 ?, ?, ?, NOW(), NOW())`,
        [
          movementId,
          input.vendor_id,
          input.variant_id,
          input.type,
          -input.qty,
          (-input.qty).toString(),
          input.source_id ?? null,
          input.actor_id ?? null,
          input.note ?? null,
        ],
      )

      return { new_on_hand: newOnHand, movement_id: movementId }
    })
  }

  async incrementStock(input: IncrementStockInput): Promise<IncrementStockResult> {
    if (input.qty <= 0) {
      throw new Error("qty must be positive")
    }

    const container: any = (this as any).__container__
    const pg: any =
      container?.[ContainerRegistrationKeys.PG_CONNECTION] ??
      container?.["__pg_connection__"]
    if (!pg) {
      throw new Error("PG connection not available in WMS container")
    }

    return await pg.transaction(async (trx: any) => {
      // 1) Ensure pool row exists (implicit 0/0 if missing).
      const newPoolId = `sp_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      await trx.raw(
        `INSERT INTO wms_stock_pool
           (id, vendor_id, variant_id, on_hand_qty, raw_on_hand_qty,
            reserved_qty, raw_reserved_qty, created_at, updated_at)
         VALUES (?, ?, ?, 0, '{"value":"0"}'::jsonb, 0, '{"value":"0"}'::jsonb, NOW(), NOW())
         ON CONFLICT (vendor_id, variant_id) WHERE deleted_at IS NULL DO NOTHING`,
        [newPoolId, input.vendor_id, input.variant_id],
      )

      // 2) Atomic increment — no constraint to check; always succeeds when row exists.
      const upd = await trx.raw(
        `UPDATE wms_stock_pool
           SET on_hand_qty = on_hand_qty + ?::numeric,
               raw_on_hand_qty = jsonb_build_object('value', (on_hand_qty + ?::numeric)::text),
               last_movement_at = NOW(),
               updated_at = NOW()
         WHERE vendor_id = ? AND variant_id = ? AND deleted_at IS NULL
         RETURNING on_hand_qty::numeric AS new_on_hand`,
        [input.qty, input.qty, input.vendor_id, input.variant_id],
      )
      const updRows = upd?.rows ?? upd
      const newOnHand = Number(updRows[0].new_on_hand)

      // 3) Append-only audit row
      const movementId = `mv_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      await trx.raw(
        `INSERT INTO wms_movement
           (id, vendor_id, variant_id, type, qty_delta, raw_qty_delta,
            source_id, actor_id, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?::numeric,
                 jsonb_build_object('value', ?::text),
                 ?, ?, ?, NOW(), NOW())`,
        [
          movementId,
          input.vendor_id,
          input.variant_id,
          input.type,
          input.qty,
          input.qty.toString(),
          input.source_id ?? null,
          input.actor_id ?? null,
          input.note ?? null,
        ],
      )

      return { new_on_hand: newOnHand, movement_id: movementId }
    })
  }
}

export default WmsService
