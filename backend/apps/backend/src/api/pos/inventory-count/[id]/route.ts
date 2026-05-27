import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('inventoryCountService');
  const id = (req.params as any).id;
  const [rows] = await (svc as any).listAndCountCountSessions({ id });
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  const lines = await svc.listLines(id);
  res.json({ session: rows[0], lines });
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('inventoryCountService');
  const id = (req.params as any).id;
  const body = (req.body ?? {}) as any;
  for (const k of ['variant_id', 'system_qty', 'actual_qty']) {
    if (body[k] == null) return res.status(400).json({ error: `${k} required` });
  }
  // Look up the session so the audit-log middleware can attribute the addLine
  // row to the vendor (request body carries no vendor_id).
  const [rows] = await svc.listAndCountCountSessions({ id });
  if (rows.length) {
    (req as any).audit_context = { vendor_id: rows[0].vendor_id };
  }
  const line = await svc.addLine({ session_id: id, ...body });
  res.json({ line });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('inventoryCountService');
  const id = (req.params as any).id;
  // Look up session for vendor attribution before cancelling (cancel returns
  // the updated row but we resolve up-front for clarity + parity with PATCH).
  const [rows] = await svc.listAndCountCountSessions({ id });
  if (rows.length) {
    (req as any).audit_context = { vendor_id: rows[0].vendor_id };
  }
  const session = await svc.cancel(id);
  res.json({ session });
}
