import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('onlineOrderService');
  const wms: any = req.scope.resolve('wmsService');
  const id = (req.params as any).id;

  const full = await svc.getWithLines(id);
  if (!full) return res.status(404).json({ error: 'order not found' });
  (req as any).audit_context = { vendor_id: full.vendor_id };

  if (full.status !== 'pending') {
    return res.status(409).json({ error: `order is ${full.status}, not pending` });
  }

  // Stock-first: reserve every line; roll back all on any shortfall.
  const made: string[] = [];
  try {
    for (const line of full.lines) {
      const r = await wms.createReservation({
        vendor_id: full.vendor_id,
        variant_id: line.variant_id,
        qty: line.qty,
        order_id: full.id,
      });
      made.push(r.id);
    }
  } catch (e: any) {
    for (const rid of made) {
      await wms.releaseReservation({ reservation_id: rid, reason: 'accept-rollback' }).catch(() => {});
    }
    return res.status(409).json({ error: e?.message ?? 'insufficient stock' });
  }

  const updated = await svc.transition(id, 'accepted');
  res.json({ order: updated, reservations: made.length });
}
