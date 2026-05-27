import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('onlineOrderService');
  const id = (req.params as any).id;
  const [rows] = await svc.listAndCountOnlineOrders({ id });
  if (!rows.length) return res.status(404).json({ error: 'order not found' });
  (req as any).audit_context = { vendor_id: rows[0].vendor_id };
  const updated = await svc.transition(id, 'rejected');
  res.json({ order: updated });
}
