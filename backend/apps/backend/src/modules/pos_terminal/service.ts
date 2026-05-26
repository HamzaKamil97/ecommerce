import { MedusaService, ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Sale } from './models/sale.model';
import { SaleLine } from './models/sale-line.model';
import { Cashier } from './models/cashier.model';
import {
  CashierDTO,
  CreateCashierInput,
  PosTerminalServiceInterface,
  RecordSaleInput,
  RecordSaleResult,
} from './types';
import { PosTerminalBadPinError } from './errors';
import { POS_TERMINAL_EVENTS } from './events';

class PosTerminalServiceBase extends MedusaService({ Sale, SaleLine, Cashier }) {}

const SCRYPT_KEYLEN = 32;
function hashPin(pin: string, salt: string): string {
  return scryptSync(pin, salt, SCRYPT_KEYLEN).toString('hex');
}

// Pre-computed once at module load. Salt + hash are arbitrary 32-byte hex
// values; their only purpose is to make the not-found path execute the same
// scrypt+timingSafeEqual sequence as the found path, so an attacker cannot
// distinguish "wrong PIN" from "wrong cashier_id" by response latency.
const DUMMY_PIN_SALT =
  '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const DUMMY_PIN_HASH = scryptSync('__dummy__', DUMMY_PIN_SALT, SCRYPT_KEYLEN)
  .toString('hex');

/**
 * Discriminates whether an error from createSales() is specifically a UNIQUE
 * constraint violation on pos_sale.client_id.
 *
 * Probe findings (2026-05-25): Medusa's dbErrorMapper intercepts the raw PG
 * UniqueConstraintViolationException before it reaches our catch block and
 * converts it into a MedusaError with:
 *   e.__isMedusaError === true
 *   e.type             === 'invalid_data'
 *   e.message          === "Pos sale with client_id: <value>, already exists."
 *
 * The raw pg code '23505', driverError, constraint, and previous fields are
 * NOT present — the MedusaError swallows them. We therefore match on the
 * MedusaError identity + message content.
 *
 * Defensive fallback: also accept raw pg/knex/MikroORM shapes in case
 * dbErrorMapper is bypassed in a future Medusa version.
 */
function isUniqueClientIdViolation(e: any): boolean {
  // Primary path: Medusa dbErrorMapper converts 23505 → MedusaError(invalid_data)
  // with message "Pos sale with client_id: <value>, already exists."
  if (e?.__isMedusaError && e?.type === 'invalid_data') {
    const msg = String(e?.message ?? '');
    return msg.includes('client_id') && msg.includes('already exists');
  }
  // Defensive fallback: raw PG / MikroORM / knex shapes (future-proof)
  const code = e?.code ?? e?.driverError?.code ?? e?.previous?.code;
  if (code === '23505') {
    const constraint = String(
      e?.constraint ?? e?.driverError?.constraint ?? e?.previous?.constraint ?? '',
    );
    return constraint.length === 0 || constraint.includes('client_id');
  }
  if (e?.name === 'UniqueConstraintViolationException') {
    const msg = String(e?.message ?? '');
    return msg.includes('client_id');
  }
  return false;
}

export class PosTerminalService extends PosTerminalServiceBase
  implements PosTerminalServiceInterface {
  ping(): string {
    return 'pos-terminal-ok';
  }

  private async emitEvent(name: string, data: unknown): Promise<void> {
    const eventBus: any =
      (this as any).eventBusModuleService_ ??
      (this as any).__container__?.['event_bus'];
    if (!eventBus || typeof eventBus.emit !== 'function') return;
    try { await eventBus.emit({ name, data }); }
    catch { try { await eventBus.emit(name, data); } catch { /* swallow */ } }
  }

  async recordSale(input: RecordSaleInput): Promise<RecordSaleResult> {
    if (!input.lines.length) throw new Error('Sale must have at least one line');
    for (const l of input.lines) {
      if (l.qty <= 0) throw new Error('Line qty must be positive');
      if (l.unit_price_minor < 0) throw new Error('Line price must be non-negative');
    }

    // 1) Idempotency short-circuit — if a sale with this client_id already exists, return it.
    //    Use raw SQL to avoid MikroORM identity-map / filter issues with unique client_id lookup.
    const pg: any =
      (this as any).__container__[ContainerRegistrationKeys.PG_CONNECTION] ??
      (this as any).__container__['__pg_connection__'];
    if (!pg) throw new Error('PG connection not available in pos_terminal container');

    const existingSel = await pg.raw(
      `SELECT id, total_minor::numeric AS total_minor, change_due_minor::numeric AS change_due_minor
         FROM pos_sale
        WHERE client_id = ? AND deleted_at IS NULL
        LIMIT 1`,
      [input.client_id],
    );
    const existingRows: any[] = existingSel?.rows ?? existingSel ?? [];
    if (existingRows.length) {
      const sale = existingRows[0];
      const linesSel = await pg.raw(
        `SELECT variant_id FROM pos_sale_line WHERE sale_id = ? AND deleted_at IS NULL`,
        [sale.id],
      );
      const lineRows: any[] = linesSel?.rows ?? linesSel ?? [];
      const wmsIdem: any = (this as any).__container__['wmsService'];
      const stock_after = await Promise.all(
        lineRows.map(async (l: any) => {
          const snap = await wmsIdem.getStock(input.vendor_id, l.variant_id);
          return { variant_id: l.variant_id, on_hand: snap.on_hand, available: snap.available };
        }),
      );
      return {
        sale_id: sale.id,
        total_minor: Number(sale.total_minor),
        change_due_minor: Number(sale.change_due_minor),
        stock_after,
      };
    }

    const wms: any = (this as any).__container__['wmsService'];

    // 2) Decrement stock for all lines FIRST (wmsService is atomic per line and throws on insufficient).
    //    If any line fails, manually compensate the ones that succeeded (no shared txn across modules).
    const succeeded: Array<{ variant_id: string; qty: number }> = [];
    try {
      for (const l of input.lines) {
        await wms.decrementStock({
          vendor_id: input.vendor_id,
          variant_id: l.variant_id,
          qty: l.qty,
          type: 'sale',
          source_id: input.client_id,
          actor_id: input.cashier_id,
          note: `terminal=${input.terminal_id}`,
        });
        succeeded.push({ variant_id: l.variant_id, qty: l.qty });
      }
    } catch (e) {
      for (const s of succeeded) {
        try {
          await wms.incrementStock({
            vendor_id: input.vendor_id, variant_id: s.variant_id, qty: s.qty,
            type: 'adjustment', source_id: input.client_id, actor_id: input.cashier_id,
            note: 'pos_sale rollback',
          });
        } catch { /* best effort; drift detector will catch true outliers */ }
      }
      throw e;
    }

    // 3) Write sale + lines (Medusa MikroORM auto-CRUD; transactional inside MedusaService)
    const total = input.lines.reduce((acc, l) => acc + l.qty * l.unit_price_minor, 0);
    const change = Math.max(0, input.paid_amount_minor - total);

    let saleRow: any;
    try {
      const created = await (this as any).createSales({
        vendor_id: input.vendor_id,
        cashier_id: input.cashier_id,
        terminal_id: input.terminal_id,
        client_id: input.client_id,
        total_minor: total,
        paid_amount_minor: input.paid_amount_minor,
        change_due_minor: change,
        currency_code: input.currency_code,
        status: 'completed',
        client_created_at: input.client_created_at,
      });
      saleRow = Array.isArray(created) ? created[0] : created;
    } catch (e: any) {
      // Always compensate the stock decrements we did above — regardless of error type.
      for (const s of succeeded) {
        try {
          await wms.incrementStock({
            vendor_id: input.vendor_id, variant_id: s.variant_id, qty: s.qty,
            type: 'adjustment', source_id: input.client_id, actor_id: input.cashier_id,
            note: 'pos_sale createSales rollback',
          });
        } catch { /* best effort */ }
      }
      if (isUniqueClientIdViolation(e)) {
        // Concurrent duplicate — the winner already wrote the sale; recurse to hit idempotency.
        return this.recordSale(input);
      }
      // Any other error is a real failure — propagate it so the caller knows.
      throw e;
    }

    try {
      await (this as any).createSaleLines(
        input.lines.map((l) => ({
          sale_id: saleRow.id,
          variant_id: l.variant_id,
          qty: l.qty,
          unit_price_minor: l.unit_price_minor,
          name_snapshot: l.name_snapshot,
        })),
      );
    } catch (e: any) {
      // Soft-delete the sale row first so client_id frees up and the idempotency
      // check (WHERE deleted_at IS NULL) won't find it on a future retry.
      try {
        await (this as any).softDeleteSales([saleRow.id]);
      } catch { /* best effort — drift detector + manual audit will catch */ }

      // Compensate stock — same loop as the createSales catch block above.
      for (const s of succeeded) {
        try {
          await wms.incrementStock({
            vendor_id: input.vendor_id, variant_id: s.variant_id, qty: s.qty,
            type: 'adjustment', source_id: input.client_id, actor_id: input.cashier_id,
            note: 'pos_sale createSaleLines rollback',
          });
        } catch { /* best effort */ }
      }
      throw e;
    }

    const stock_after = await Promise.all(
      input.lines.map(async (l) => {
        const snap = await wms.getStock(input.vendor_id, l.variant_id);
        return { variant_id: l.variant_id, on_hand: snap.on_hand, available: snap.available };
      }),
    );

    await this.emitEvent(POS_TERMINAL_EVENTS.SALE_RECORDED, {
      sale_id: saleRow.id, vendor_id: input.vendor_id, terminal_id: input.terminal_id,
      cashier_id: input.cashier_id, total_minor: total, line_count: input.lines.length,
    });

    return { sale_id: saleRow.id, total_minor: total, change_due_minor: change, stock_after };
  }

  async createCashier(input: CreateCashierInput): Promise<CashierDTO> {
    const salt = randomBytes(16).toString('hex');
    const pin_hash = hashPin(input.pin, salt);
    const created = await (this as any).createCashiers({
      vendor_id: input.vendor_id,
      name: input.name,
      role: input.role,
      pin_hash,
      pin_salt: salt,
      active: true,
    });
    const row: any = Array.isArray(created) ? created[0] : created;
    return {
      id: row.id,
      vendor_id: row.vendor_id,
      name: row.name,
      role: row.role,
      active: row.active,
    };
  }

  async listCashiers(vendorId: string) {
    const [rows] = await (this as any).listAndCountCashiers({
      vendor_id: vendorId,
      active: true,
    });
    return rows.map((r: any) => ({
      id: r.id,
      vendor_id: r.vendor_id,
      name: r.name,
      role: r.role,
      active: r.active,
      pin_hash_prefix: String(r.pin_hash).slice(0, 8),
    }));
  }

  async verifyCashierPin(cashierId: string, pin: string): Promise<CashierDTO> {
    const [rows] = await (this as any).listAndCountCashiers({
      id: cashierId,
      active: true,
    });
    const row = rows[0];
    const salt = row?.pin_salt ?? DUMMY_PIN_SALT;
    const storedHex = row?.pin_hash ?? DUMMY_PIN_HASH;

    const candidate = Buffer.from(hashPin(pin, salt), 'hex');
    const stored = Buffer.from(storedHex, 'hex');
    const lengthsMatch = candidate.length === stored.length;
    // timingSafeEqual requires equal lengths. If they differ, do an equal-length
    // compare against a truncated slice (result discarded) so the not-found and
    // wrong-PIN paths execute the same number of crypto ops, then return false.
    const safeMatch = lengthsMatch
      ? timingSafeEqual(candidate, stored)
      : (timingSafeEqual(
          candidate.slice(0, Math.min(candidate.length, stored.length)),
          stored.slice(0, Math.min(candidate.length, stored.length)),
        ), false);

    if (!row || !safeMatch) throw new PosTerminalBadPinError(cashierId);

    return {
      id: row.id,
      vendor_id: row.vendor_id,
      name: row.name,
      role: row.role,
      active: row.active,
    };
  }
}

export default PosTerminalService;
