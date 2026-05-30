// backend/apps/backend/src/modules/online_order/service.ts
import { MedusaService } from '@medusajs/framework/utils';
import { OnlineOrder } from './models/online-order.model';
import { OnlineOrderLine } from './models/online-order-line.model';
import { CreateOnlineOrderInput, OnlineOrderStatus } from './types';

class OnlineOrderServiceBase extends MedusaService({ OnlineOrder, OnlineOrderLine }) {}

export class OnlineOrderService extends OnlineOrderServiceBase {
  ping(): string { return 'online-order-ok'; }

  async createOrder(input: CreateOnlineOrderInput) {
    const order = await (this as any).createOnlineOrders({
      vendor_id: input.vendor_id,
      customer_id: input.customer_id ?? null,
      customer_name: input.customer_name ?? null,
      customer_phone: input.customer_phone ?? null,
      total_minor: input.total_minor,
      currency_code: input.currency_code ?? 'iqd',
      commission_rate_bps_snapshot: input.commission_rate_bps_snapshot,
      commission_minor: input.commission_minor,
      delivery_address: input.delivery_address ?? null,
      delivery_lat: input.delivery_lat ?? null,
      delivery_lng: input.delivery_lng ?? null,
      voice_note_url: input.voice_note_url ?? null,
      medusa_order_id: input.medusa_order_id ?? null,
      display_id: input.display_id ?? null,
      placed_at: new Date(),
    });
    const row = Array.isArray(order) ? order[0] : order;
    for (const l of input.lines) {
      await (this as any).createOnlineOrderLines({
        order_id: row.id,
        variant_id: l.variant_id, title: l.title, qty: l.qty,
        unit_price_minor: l.unit_price_minor, line_total_minor: l.line_total_minor,
        aisle_hint: l.aisle_hint ?? null,
      });
    }
    return row;
  }

  async listByStatus(vendor_id: string, status: OnlineOrderStatus | 'all', opts: { limit?: number } = {}) {
    const filter: any = { vendor_id };
    if (status !== 'all') filter.status = status;
    const [rows] = await (this as any).listAndCountOnlineOrders(
      filter, { take: opts.limit ?? 50, order: { placed_at: 'DESC' } },
    );
    return rows;
  }

  async getWithLines(id: string) {
    const [rows] = await (this as any).listAndCountOnlineOrders({ id });
    if (!rows.length) return null;
    const [lines] = await (this as any).listAndCountOnlineOrderLines(
      { order_id: id }, { order: { created_at: 'ASC' } },
    );
    return { ...rows[0], lines };
  }

  async transition(id: string, to: OnlineOrderStatus) {
    const stamps: any = { status: to, id };
    const now = new Date();
    if (to === 'accepted') stamps.accepted_at = now;
    if (to === 'rejected') stamps.rejected_at = now;
    if (to === 'delivered') stamps.delivered_at = now;
    const updated = await (this as any).updateOnlineOrders(stamps);
    return Array.isArray(updated) ? updated[0] : updated;
  }

  async markLinePicked(line_id: string, picked: boolean, oos: boolean = false) {
    const updated = await (this as any).updateOnlineOrderLines({ id: line_id, picked, oos });
    return Array.isArray(updated) ? updated[0] : updated;
  }

  async getByMedusaOrderId(medusaOrderId: string) {
    const [rows] = await (this as any).listAndCountOnlineOrders({ medusa_order_id: medusaOrderId });
    return rows.length ? rows[0] : null;
  }
}

export default OnlineOrderService;
