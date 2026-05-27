import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('cashSessionService');
  const vendor_id = req.query.vendor_id as string;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const limit = Number(req.query.limit ?? 30);
  const offset = Number(req.query.offset ?? 0);
  const sessions = await svc.listHistory(vendor_id, { limit, offset });
  res.json({ sessions });
}
