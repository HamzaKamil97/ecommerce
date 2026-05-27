import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('cashSessionService');
  const body = (req.body ?? {}) as any;
  for (const k of ['vendor_id', 'terminal_id', 'cashier_id', 'opening_float_minor']) {
    if (body[k] == null) return res.status(400).json({ error: `${k} required` });
  }
  try {
    const session = await svc.openSession(body);
    res.json({ session });
  } catch (e: any) {
    const status = e.code === 'CASH_SESSION_OPEN_EXISTS' ? 409 : 400;
    res.status(status).json({ error: e?.message, code: e?.code });
  }
}
