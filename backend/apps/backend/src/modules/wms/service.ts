import { ContainerRegistrationKeys, MedusaService } from "@medusajs/framework/utils"
import { randomUUID } from "crypto"
import { StockPool } from "./models/stock-pool.model"
import { Movement } from "./models/movement.model"
import { Reservation } from "./models/reservation.model"
import { ShopLocation } from "./models/shop-location.model"
import {
  ConsumeReservationInput,
  CreateReservationInput,
  DecrementStockInput,
  DecrementStockResult,
  ExpireReservationsResult,
  IncrementStockInput,
  IncrementStockResult,
  ReleaseReservationInput,
  ReservationDTO,
  ShopLocationResult,
  ShopsWithinRadiusInput,
  StockSnapshot,
  UpsertShopLocationInput,
  WmsServiceInterface,
} from "./types"
import { WmsInsufficientStockError } from "./errors"

class WmsServiceBase extends MedusaService({
  StockPool,
  Movement,
  Reservation,
  ShopLocation,
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

  async createReservation(input: CreateReservationInput): Promise<ReservationDTO> {
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
    const ttl = input.ttl_seconds ?? 900

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

      // 2) Lock the pool row so concurrent reservations serialize across the
      // read-check-write that follows.
      const poolSel = await trx.raw(
        `SELECT on_hand_qty::numeric AS on_hand
           FROM wms_stock_pool
          WHERE vendor_id = ? AND variant_id = ? AND deleted_at IS NULL
          FOR UPDATE`,
        [input.vendor_id, input.variant_id],
      )
      const poolRows = poolSel?.rows ?? poolSel
      const onHand = Number(poolRows[0].on_hand)

      // 3) Sum live (active + unexpired) reservations from the source of truth,
      // NOT the cached reserved_qty on the pool (which could be stale).
      const sumSel = await trx.raw(
        `SELECT COALESCE(SUM(qty::numeric), 0) AS reserved
           FROM wms_reservation
          WHERE vendor_id = ? AND variant_id = ?
            AND status = 'active'
            AND expires_at > NOW()
            AND deleted_at IS NULL`,
        [input.vendor_id, input.variant_id],
      )
      const sumRows = sumSel?.rows ?? sumSel
      const reservedExisting = Number(sumRows[0].reserved)
      const available = onHand - reservedExisting
      if (available < input.qty) {
        throw new WmsInsufficientStockError(
          input.vendor_id,
          input.variant_id,
          input.qty,
          available,
        )
      }

      // 4) Insert the reservation row.
      const rsId = `rs_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      const ins = await trx.raw(
        `INSERT INTO wms_reservation
           (id, vendor_id, order_id, variant_id, qty, raw_qty,
            expires_at, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?::numeric,
                 jsonb_build_object('value', ?::text),
                 NOW() + (? || ' seconds')::interval,
                 'active', NOW(), NOW())
         RETURNING expires_at`,
        [
          rsId,
          input.vendor_id,
          input.order_id,
          input.variant_id,
          input.qty,
          input.qty.toString(),
          String(ttl),
        ],
      )
      const insRows = ins?.rows ?? ins
      const expiresAt = new Date(insRows[0].expires_at)

      // 5) Bump the reserved_qty cache on the pool (both NUMERIC + JSONB).
      await trx.raw(
        `UPDATE wms_stock_pool
           SET reserved_qty = reserved_qty + ?::numeric,
               raw_reserved_qty = jsonb_build_object('value', (reserved_qty + ?::numeric)::text),
               updated_at = NOW()
         WHERE vendor_id = ? AND variant_id = ? AND deleted_at IS NULL`,
        [input.qty, input.qty, input.vendor_id, input.variant_id],
      )

      return {
        id: rsId,
        vendor_id: input.vendor_id,
        order_id: input.order_id,
        variant_id: input.variant_id,
        qty: input.qty,
        expires_at: expiresAt,
        status: "active",
      }
    })
  }

  async consumeReservation(input: ConsumeReservationInput): Promise<{ ok: true }> {
    const container: any = (this as any).__container__
    const pg: any =
      container?.[ContainerRegistrationKeys.PG_CONNECTION] ??
      container?.["__pg_connection__"]
    if (!pg) {
      throw new Error("PG connection not available in WMS container")
    }

    return await pg.transaction(async (trx: any) => {
      // 1) Lock reservation, ensure it's active
      const rsSel = await trx.raw(
        `SELECT vendor_id, variant_id, qty::numeric AS qty, status
           FROM wms_reservation
          WHERE id = ? AND deleted_at IS NULL
          FOR UPDATE`,
        [input.reservation_id],
      )
      const rsRows = rsSel?.rows ?? rsSel
      if (!rsRows || rsRows.length === 0 || rsRows[0].status !== "active") {
        throw new Error(`Reservation ${input.reservation_id} not active`)
      }
      const r = rsRows[0]
      const qty = Number(r.qty)

      // 2) Decrement on_hand AND reserved on the pool (atomic, both dual-col)
      await trx.raw(
        `UPDATE wms_stock_pool
           SET on_hand_qty   = on_hand_qty - ?::numeric,
               raw_on_hand_qty = jsonb_build_object('value', (on_hand_qty - ?::numeric)::text),
               reserved_qty  = reserved_qty - ?::numeric,
               raw_reserved_qty = jsonb_build_object('value', (reserved_qty - ?::numeric)::text),
               last_movement_at = NOW(),
               updated_at = NOW()
         WHERE vendor_id = ? AND variant_id = ? AND deleted_at IS NULL`,
        [qty, qty, qty, qty, r.vendor_id, r.variant_id],
      )

      // 3) Mark reservation consumed
      await trx.raw(
        `UPDATE wms_reservation
           SET status = 'consumed', consumed_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [input.reservation_id],
      )

      // 4) Movement audit (type='pick')
      const movementId = `mv_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      await trx.raw(
        `INSERT INTO wms_movement
           (id, vendor_id, variant_id, type, qty_delta, raw_qty_delta, source_id, actor_id, note, created_at, updated_at)
         VALUES (?, ?, ?, 'pick', ?::numeric, jsonb_build_object('value', ?::text),
                 ?, ?, ?, NOW(), NOW())`,
        [
          movementId, r.vendor_id, r.variant_id,
          -qty, (-qty).toString(),
          input.reservation_id, input.actor_id ?? null, input.note ?? null,
        ],
      )
      return { ok: true as const }
    })
  }

  async releaseReservation(input: ReleaseReservationInput): Promise<{ ok: true }> {
    const container: any = (this as any).__container__
    const pg: any =
      container?.[ContainerRegistrationKeys.PG_CONNECTION] ??
      container?.["__pg_connection__"]
    if (!pg) {
      throw new Error("PG connection not available in WMS container")
    }

    return await pg.transaction(async (trx: any) => {
      const rsSel = await trx.raw(
        `SELECT vendor_id, variant_id, qty::numeric AS qty, status
           FROM wms_reservation
          WHERE id = ? AND deleted_at IS NULL
          FOR UPDATE`,
        [input.reservation_id],
      )
      const rsRows = rsSel?.rows ?? rsSel
      if (!rsRows || rsRows.length === 0 || rsRows[0].status !== "active") {
        throw new Error(`Reservation ${input.reservation_id} not active`)
      }
      const r = rsRows[0]
      const qty = Number(r.qty)

      // Drop reserved_qty cache (on_hand untouched)
      await trx.raw(
        `UPDATE wms_stock_pool
           SET reserved_qty = reserved_qty - ?::numeric,
               raw_reserved_qty = jsonb_build_object('value', (reserved_qty - ?::numeric)::text),
               updated_at = NOW()
         WHERE vendor_id = ? AND variant_id = ? AND deleted_at IS NULL`,
        [qty, qty, r.vendor_id, r.variant_id],
      )

      await trx.raw(
        `UPDATE wms_reservation
           SET status = 'released', released_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [input.reservation_id],
      )

      const movementId = `mv_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      await trx.raw(
        `INSERT INTO wms_movement
           (id, vendor_id, variant_id, type, qty_delta, raw_qty_delta, source_id, actor_id, note, created_at, updated_at)
         VALUES (?, ?, ?, 'release', 0, '{"value":"0"}'::jsonb,
                 ?, NULL, ?, NOW(), NOW())`,
        [movementId, r.vendor_id, r.variant_id, input.reservation_id, input.reason ?? null],
      )
      return { ok: true as const }
    })
  }

  async expireReservations(): Promise<ExpireReservationsResult> {
    const container: any = (this as any).__container__
    const pg: any =
      container?.[ContainerRegistrationKeys.PG_CONNECTION] ??
      container?.["__pg_connection__"]
    if (!pg) {
      throw new Error("PG connection not available in WMS container")
    }

    return await pg.transaction(async (trx: any) => {
      const sel = await trx.raw(
        `SELECT id, vendor_id, variant_id, qty::numeric AS qty
           FROM wms_reservation
          WHERE status = 'active'
            AND expires_at < NOW()
            AND deleted_at IS NULL
          FOR UPDATE SKIP LOCKED`,
      )
      const rows = sel?.rows ?? sel ?? []
      for (const row of rows) {
        const qty = Number(row.qty)

        await trx.raw(
          `UPDATE wms_reservation
             SET status = 'expired', released_at = NOW(), updated_at = NOW()
           WHERE id = ?`,
          [row.id],
        )

        await trx.raw(
          `UPDATE wms_stock_pool
             SET reserved_qty = reserved_qty - ?::numeric,
                 raw_reserved_qty = jsonb_build_object('value', (reserved_qty - ?::numeric)::text),
                 updated_at = NOW()
           WHERE vendor_id = ? AND variant_id = ? AND deleted_at IS NULL`,
          [qty, qty, row.vendor_id, row.variant_id],
        )

        const movementId = `mv_${randomUUID().replace(/-/g, "").slice(0, 16)}`
        await trx.raw(
          `INSERT INTO wms_movement
             (id, vendor_id, variant_id, type, qty_delta, raw_qty_delta, source_id, actor_id, note, created_at, updated_at)
           VALUES (?, ?, ?, 'release', 0, '{"value":"0"}'::jsonb,
                   ?, NULL, 'auto-expired', NOW(), NOW())`,
          [movementId, row.vendor_id, row.variant_id, row.id],
        )
      }
      return { expired_count: rows.length }
    })
  }

  async upsertShopLocation(input: UpsertShopLocationInput): Promise<{ ok: true }> {
    const container: any = (this as any).__container__
    const pg: any =
      container?.[ContainerRegistrationKeys.PG_CONNECTION] ??
      container?.["__pg_connection__"]
    if (!pg) {
      throw new Error("PG connection not available in WMS container")
    }
    await pg.raw(
      `INSERT INTO wms_shop_location
         (vendor_id, lat, lng, delivery_radius_km, address_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON CONFLICT (vendor_id) DO UPDATE
         SET lat = EXCLUDED.lat,
             lng = EXCLUDED.lng,
             delivery_radius_km = EXCLUDED.delivery_radius_km,
             address_text = EXCLUDED.address_text,
             updated_at = NOW()`,
      [input.vendor_id, input.lat, input.lng, input.delivery_radius_km, input.address_text ?? null],
    )
    return { ok: true as const }
  }

  async shopsWithinRadius(input: ShopsWithinRadiusInput): Promise<ShopLocationResult[]> {
    const container: any = (this as any).__container__
    const pg: any =
      container?.[ContainerRegistrationKeys.PG_CONNECTION] ??
      container?.["__pg_connection__"]
    if (!pg) {
      throw new Error("PG connection not available in WMS container")
    }
    const result = await pg.raw(
      `WITH q AS (
         SELECT vendor_id, lat, lng, delivery_radius_km,
           (6371 * 2 * ASIN(SQRT(
             POWER(SIN(RADIANS((? - lat) / 2)), 2) +
             COS(RADIANS(?)) * COS(RADIANS(lat)) *
             POWER(SIN(RADIANS((? - lng) / 2)), 2)
           ))) AS distance_km
         FROM wms_shop_location
         WHERE deleted_at IS NULL
       )
       SELECT * FROM q
       WHERE distance_km <= LEAST(?::double precision, delivery_radius_km)
       ORDER BY distance_km ASC`,
      [input.lat, input.lat, input.lng, input.radius_km],
    )
    const rows = result?.rows ?? result ?? []
    return rows.map((r: any) => ({
      vendor_id: r.vendor_id,
      lat: Number(r.lat),
      lng: Number(r.lng),
      delivery_radius_km: Number(r.delivery_radius_km),
      distance_km: Number(r.distance_km),
    }))
  }
}

export default WmsService
