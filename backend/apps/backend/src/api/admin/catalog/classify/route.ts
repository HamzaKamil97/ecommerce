import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { name, hint } = (req.body ?? {}) as any;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name required' });
  }
  const ai: any = req.scope.resolve('ai');
  const schemaSvc: any = req.scope.resolve('catalogSchemaService');
  const cats = await schemaSvc.listCategories();
  const allowed = cats.map((c: any) => c.handle);
  const out = await ai.classifyProductCategory(name, hint, allowed);
  res.json(out);
}
