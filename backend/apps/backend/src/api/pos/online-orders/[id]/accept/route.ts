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
  const releaseAll = async (reason: string) => {
    for (const rid of made) {
      await wms.releaseReservation({ reservation_id: rid, reason }).catch(() => {});
    }
  };
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
    await releaseAll('accept-rollback');
    // Only a genuine stock shortfall is a 409 (conflict the cashier can act on).
    // Infra failures (DB down, etc.) must surface as 500 so clients don't retry-as-conflict.
    const isShortfall = e?.name === 'WmsInsufficientStockError';
    return res.status(isShortfall ? 409 : 500).json({ error: e?.message ?? 'reservation failed' });
  }

  // Reservations are committed; if the status transition fails, release them so we
  // don't leave a 'pending' order holding stock (and avoid duplicate reservations on retry).
  let updated: any;
  try {
    updated = await svc.transition(id, 'accepted');
  } catch (e: any) {
    await releaseAll('accept-transition-failed');
    return res.status(500).json({ error: e?.message ?? 'failed to accept order' });
  }
  res.json({ order: updated, reservations: made.length });
}
