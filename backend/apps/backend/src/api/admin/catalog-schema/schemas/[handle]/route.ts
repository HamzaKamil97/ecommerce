import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('catalogSchemaService');
  const handle = (req.params as any).handle as string;
  const schema = await svc.getSchemaByHandle(handle);
  if (!schema) return res.status(404).json({ error: `no schema for handle "${handle}"` });
  res.json({ schema });
}
