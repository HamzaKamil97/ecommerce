import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('inventoryCountService');
  const body = (req.body ?? {}) as any;
  for (const k of ['vendor_id', 'actor_id', 'scope']) {
    if (body[k] == null) return res.status(400).json({ error: `${k} required` });
  }
  try {
    const session = await svc.openCount(body);
    res.json({ session });
  } catch (e: any) {
    res.status(400).json({ error: e?.message, code: e?.code });
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('inventoryCountService');
  const vendor_id = req.query.vendor_id as string;
  const status = (req.query.status as string) ?? 'in_progress';
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const [rows] = await (svc as any).listAndCountCountSessions(
    { vendor_id, status },
    { order: { created_at: 'DESC' } },
  );
  res.json({ sessions: rows });
}
