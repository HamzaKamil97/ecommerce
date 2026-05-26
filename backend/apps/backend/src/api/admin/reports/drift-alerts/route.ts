import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  const wms: any = req.scope.resolve('wmsService');
  const report = await wms.detectStockDrift({ vendor_id });
  res.json(report);
}
