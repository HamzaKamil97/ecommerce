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
  const line = await svc.addLine({ session_id: id, ...body });
  res.json({ line });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('inventoryCountService');
  const id = (req.params as any).id;
  const session = await svc.cancel(id);
  res.json({ session });
}
