import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('cashSessionService');
  const body = (req.body ?? {}) as any;
  for (const k of ['session_id', 'cashier_id', 'counted_total_minor', 'denomination_count']) {
    if (body[k] == null) return res.status(400).json({ error: `${k} required` });
  }
  try {
    const session = await svc.closeSession(body);
    // Attribute audit row to the session's vendor. The request body only
    // carries session_id; without this, audit-log middleware would write
    // vendor_id=null and the row would not surface in listAuditByVendor.
    (req as any).audit_context = { vendor_id: session?.vendor_id ?? null };
    res.json({ session });
  } catch (e: any) {
    const status = e.code === 'CASH_SESSION_NOT_FOUND' ? 404
      : e.code === 'CASH_SESSION_ALREADY_CLOSED' ? 409
      : 400;
    res.status(status).json({ error: e?.message, code: e?.code });
  }
}
