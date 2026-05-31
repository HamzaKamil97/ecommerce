import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('onlineOrderService');
  const wms: any = req.scope.resolve('wmsService');
  const logger: any = req.scope.resolve('logger');
  const id = (req.params as any).id;
  const full = await svc.getWithLines(id);
  if (!full) return res.status(404).json({ error: 'order not found' });
  (req as any).audit_context = { vendor_id: full.vendor_id };

  // Release active reservations for this order → drops the hold, on_hand untouched.
  // A TTL-expired reservation throws "not active" and is benign; log other failures.
  const reservations = await wms.listReservations({ order_id: id, status: 'active' });
  for (const r of reservations) {
    await wms.releaseReservation({ reservation_id: r.id, reason: 'rejected' }).catch((err: any) => {
      if (!String(err?.message ?? '').includes('not active')) {
        logger.warn(`[reject] releaseReservation ${r.id} failed: ${err?.message ?? err}`);
      }
    });
  }
  const updated = await svc.transition(id, 'rejected');
  res.json({ order: updated, released: reservations.length });
}
