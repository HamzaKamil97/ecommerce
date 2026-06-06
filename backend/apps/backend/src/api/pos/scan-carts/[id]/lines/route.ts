import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('scanCartService');
  const id = (req.params as any).id;
  const body = (req.body as any) ?? {};
  try {
    const line = await svc.addLine(id, body);
    res.json({ line });
  } catch (e: any) {
    if (/not open/i.test(e.message)) {
      return res.status(409).json({ error: e.message });
    }
    if (e.code === 'not_found') {
      return res.status(404).json({ error: 'cart not found' });
    }
    throw e;
  }
}
