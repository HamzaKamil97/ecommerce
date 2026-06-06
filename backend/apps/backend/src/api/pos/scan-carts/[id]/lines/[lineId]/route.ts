import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('scanCartService');
  const { id, lineId } = req.params as any;
  const body = (req.body as any) ?? {};
  try {
    const line = await svc.updateLine(id, lineId, body);
    res.json({ line });
  } catch (e: any) {
    if (/not open/i.test(e.message)) {
      return res.status(409).json({ error: e.message });
    }
    if (e.code === 'not_found' || /not in cart/i.test(e.message)) {
      return res.status(404).json({ error: e.message });
    }
    throw e;
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('scanCartService');
  const { id, lineId } = req.params as any;
  try {
    const result = await svc.removeLine(id, lineId);
    res.json(result);
  } catch (e: any) {
    if (/not open/i.test(e.message)) {
      return res.status(409).json({ error: e.message });
    }
    if (e.code === 'not_found' || /not in cart/i.test(e.message)) {
      return res.status(404).json({ error: e.message });
    }
    throw e;
  }
}
