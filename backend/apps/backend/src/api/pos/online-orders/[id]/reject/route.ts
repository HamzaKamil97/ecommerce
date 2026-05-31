import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('onlineOrderService');
  const wms: any = req.scope.resolve('wmsService');
  const id = (req.params as any).id;
  const [rows] = await svc.listAndCountOnlineOrders({ id });
  if (!rows.length) return res.status(404).json({ error: 'order not found' });
  (req as any).audit_context = { vendor_id: rows[0].vendor_id };

  // Release active reservations for this order → drops the hold, on_hand untouched.
  const reservations = await wms.listReservations({ order_id: id, status: 'active' });
  for (const r of reservations) {
    await wms.releaseReservation({ reservation_id: r.id, reason: 'rejected' }).catch(() => {});
  }
  const updated = await svc.transition(id, 'rejected');
  res.json({ order: updated, released: reservations.length });
}
