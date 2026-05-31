import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('onlineOrderService');
  const wms: any = req.scope.resolve('wmsService');
  const id = (req.params as any).id;
  const oos = ((req.body as any)?.oos_line_ids ?? []) as string[];
  if (!Array.isArray(oos)) return res.status(400).json({ error: 'oos_line_ids must be array' });

  const full = await svc.getWithLines(id);
  if (!full) return res.status(404).json({ error: 'order not found' });
  (req as any).audit_context = { vendor_id: full.vendor_id };

  // Idempotency guard (mirrors accept): only a pending order may be partially
  // accepted, so a double-tap can't create a duplicate set of reservations.
  if (full.status !== 'pending') {
    return res.status(409).json({ error: `order is ${full.status}, not pending` });
  }

  // Determine which lines need reservations: all lines NOT in the OOS set.
  const oosSet = new Set(oos);
  const toReserve = (full.lines as any[]).filter((l: any) => !oosSet.has(l.id));

  // Stock-first: attempt to reserve each non-OOS line; rollback on any shortfall.
  const made: string[] = [];
  for (const line of toReserve) {
    try {
      const rs = await wms.createReservation({
        vendor_id: full.vendor_id,
        variant_id: line.variant_id,
        qty: line.qty,
        order_id: full.id,
      });
      made.push(rs.id);
    } catch (e: any) {
      // Release all reservations made so far to avoid leaking holds.
      for (const rsId of made) {
        await wms.releaseReservation({ reservation_id: rsId, reason: 'partial-rollback' }).catch(() => {});
      }
      const isShortfall = e?.name === 'WmsInsufficientStockError';
      return res.status(isShortfall ? 409 : 500).json({
        error: isShortfall ? 'insufficient stock for non-OOS lines' : 'reservation failed',
        details: e?.message,
      });
    }
  }

  // Mark OOS lines + transition to accepted — rollback reservations if EITHER fails
  // (markLinePicked is inside the guard so a throw there can't leak the holds).
  let updated: any;
  try {
    for (const lid of oos) await svc.markLinePicked(lid, false, true);
    updated = await svc.transition(id, 'accepted');
  } catch (e: any) {
    for (const rsId of made) {
      await wms.releaseReservation({ reservation_id: rsId, reason: 'partial-rollback' }).catch(() => {});
    }
    return res.status(500).json({ error: 'partial accept failed', details: (e as any)?.message });
  }

  res.json({ order: updated, oos_line_count: oos.length, reservations: made.length });
}
