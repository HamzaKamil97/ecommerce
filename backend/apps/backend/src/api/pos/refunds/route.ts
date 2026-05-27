import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('posTerminalService');
  const body = (req.body ?? {}) as any;
  const required = [
    'vendor_id', 'cashier_id', 'manager_id', 'terminal_id',
    'original_sale_id', 'lines', 'method', 'client_id',
  ];
  for (const k of required) {
    if (body[k] == null) {
      return res.status(400).json({ error: `${k} required` });
    }
  }
  // Audit attribution — body already has vendor_id, but set audit_context for consistency
  (req as any).audit_context = { vendor_id: body.vendor_id };
  try {
    const refund = await svc.processReturn(body);
    res.json({ refund });
  } catch (e: any) {
    const status = e?.code === 'INVALID_REFUND' ? 400 : 500;
    res.status(status).json({ error: e?.message, code: e?.code });
  }
}
