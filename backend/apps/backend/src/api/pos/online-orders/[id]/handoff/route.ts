import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('onlineOrderService');
  const wms: any = req.scope.resolve('wmsService');
  const logger: any = req.scope.resolve('logger');
  const id = (req.params as any).id;
  const full = await svc.getWithLines(id);
  if (!full) return res.status(404).json({ error: 'order not found' });
  (req as any).audit_context = { vendor_id: full.vendor_id };

  // Consume active reservations for this order → decrements on_hand.
  // A TTL-expired reservation throws "not active" and is benign; surface other
  // (infra) failures in the log so we don't silently leave stock un-decremented.
  const reservations = await wms.listReservations({ order_id: id, status: 'active' });
  for (const r of reservations) {
    await wms.consumeReservation({ reservation_id: r.id, note: 'handoff' }).catch((err: any) => {
      if (!String(err?.message ?? '').includes('not active')) {
        logger.warn(`[handoff] consumeReservation ${r.id} failed: ${err?.message ?? err}`);
      }
    });
  }
  const updated = await svc.transition(id, 'delivered');
  res.json({ order: updated, consumed: reservations.length });
}
