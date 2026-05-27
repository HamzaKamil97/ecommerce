import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('onlineOrderService');
  const order = await svc.getWithLines((req.params as any).id);
  if (!order) return res.status(404).json({ error: 'not found' });
  res.json({ order });
}
