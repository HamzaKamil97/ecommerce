import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('onlineOrderService');
  const id = (req.params as any).id;
  const oos = ((req.body as any)?.oos_line_ids ?? []) as string[];
  if (!Array.isArray(oos)) return res.status(400).json({ error: 'oos_line_ids must be array' });
  const [rows] = await svc.listAndCountOnlineOrders({ id });
  if (!rows.length) return res.status(404).json({ error: 'order not found' });
  (req as any).audit_context = { vendor_id: rows[0].vendor_id };
  for (const lid of oos) await svc.markLinePicked(lid, false, true);
  const updated = await svc.transition(id, 'accepted');
  res.json({ order: updated, oos_line_count: oos.length });
}
