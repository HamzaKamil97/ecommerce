import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('scanCartService');
  const { vendor_id, staff_id } = (req.body as any) ?? {};
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  (req as any).audit_context = { vendor_id };
  const cart = await svc.createCart({ vendor_id, staff_id });
  res.status(201).json({ cart });
}
