import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('onlineOrderService');
  const vendor_id = req.query.vendor_id as string;
  const status = (req.query.status as string) ?? 'pending';
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const orders = await svc.listByStatus(vendor_id, status);
  res.json({ orders });
}
