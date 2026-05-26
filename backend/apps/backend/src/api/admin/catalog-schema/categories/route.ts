import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('catalogSchemaService');
  const categories = await svc.listCategories();
  res.json({ categories });
}
