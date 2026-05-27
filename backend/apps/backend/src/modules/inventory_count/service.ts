// backend/apps/backend/src/modules/inventory_count/service.ts
import { MedusaService } from '@medusajs/framework/utils';
import { CountSession } from './models/count-session.model';
import { CountLine } from './models/count-line.model';
import { OpenCountInput, AddCountLineInput, ApplyCountInput } from './types';

class InventoryCountServiceBase extends MedusaService({ CountSession, CountLine }) {}

export class InventoryCountService extends InventoryCountServiceBase {
  ping(): string { return 'inv-count-ok'; }

  async openCount(input: OpenCountInput) {
    const row = await (this as any).createCountSessions({
      vendor_id: input.vendor_id, actor_id: input.actor_id, scope: input.scope,
    });
    return Array.isArray(row) ? row[0] : row;
  }

  async addLine(input: AddCountLineInput) {
    const delta = input.actual_qty - input.system_qty;
    const line = await (this as any).createCountLines({
      session_id: input.session_id,
      variant_id: input.variant_id,
      system_qty: input.system_qty,
      actual_qty: input.actual_qty,
      delta,
      reason: input.reason ?? null,
    });
    return Array.isArray(line) ? line[0] : line;
  }

  async listLines(session_id: string) {
    const [rows] = await (this as any).listAndCountCountLines(
      { session_id },
      { order: { created_at: 'ASC' } },
    );
    return rows;
  }

  async cancel(session_id: string) {
    const updated = await (this as any).updateCountSessions({
      id: session_id, status: 'cancelled',
    });
    return Array.isArray(updated) ? updated[0] : updated;
  }

  async applyCount(input: ApplyCountInput) {
    const [rows] = await (this as any).listAndCountCountSessions({ id: input.session_id });
    if (!rows.length) {
      const err: any = new Error('session not found'); err.code = 'COUNT_NOT_FOUND'; throw err;
    }
    if (rows[0].status !== 'in_progress') {
      const err: any = new Error(`cannot apply session in status ${rows[0].status}`);
      err.code = 'COUNT_NOT_OPEN'; throw err;
    }
    const lines = await this.listLines(input.session_id);
    // wms exposes incrementStock / decrementStock (NOT adjustOnHand). Both take a
    // positive qty plus a MovementType. Dispatch on the sign of the delta.
    const wms: any = (this as any).__container__['wmsService'];
    let countedTotal = 0, expectedTotal = 0, deltaTotal = 0;
    for (const l of lines) {
      const delta = Number(l.delta);
      if (delta !== 0) {
        const common = {
          vendor_id: rows[0].vendor_id,
          variant_id: l.variant_id,
          type: 'adjustment' as const,
          source_id: input.session_id,
          actor_id: input.actor_id,
          note: l.reason ?? 'stock_count',
        };
        if (delta > 0) {
          await wms.incrementStock({ ...common, qty: delta });
        } else {
          await wms.decrementStock({ ...common, qty: -delta });
        }
      }
      countedTotal += Number(l.actual_qty);
      expectedTotal += Number(l.system_qty);
      deltaTotal += delta;
    }
    const updated = await (this as any).updateCountSessions({
      id: input.session_id,
      status: 'applied',
      applied_at: new Date(),
      expected_total: expectedTotal,
      counted_total: countedTotal,
      delta_total: deltaTotal,
    });
    return Array.isArray(updated) ? updated[0] : updated;
  }
}

export default InventoryCountService;
