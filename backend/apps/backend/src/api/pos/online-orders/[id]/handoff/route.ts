import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('onlineOrderService');
  const wms: any = req.scope.resolve('wmsService');
  const id = (req.params as any).id;
  const [rows] = await svc.listAndCountOnlineOrders({ id });
  if (!rows.length) return res.status(404).json({ error: 'order not found' });
  (req as any).audit_context = { vendor_id: rows[0].vendor_id };

  // Consume active reservations for this order → decrements on_hand.
  const reservations = await wms.listReservations({ order_id: id, status: 'active' });
  for (const r of reservations) {
    await wms.consumeReservation({ reservation_id: r.id, note: 'handoff' }).catch(() => {});
  }
  const updated = await svc.transition(id, 'delivered');
  res.json({ order: updated, consumed: reservations.length });
}
