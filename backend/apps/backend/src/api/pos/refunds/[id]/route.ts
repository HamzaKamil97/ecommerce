import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('posTerminalService');
  const id = (req.params as any).id;
  const [rows] = await svc.listAndCountSales({ id });
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  const [lines] = await (svc as any).listAndCountSaleLines({ sale_id: rows[0].id });
  res.json({ sale: rows[0], lines });
}
