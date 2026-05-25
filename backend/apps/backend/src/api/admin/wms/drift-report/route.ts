import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /admin/wms/drift-report?vendor_id?=  → { flagged: [...] }
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  const svc: any = req.scope.resolve("wmsService")
  const result = await svc.detectStockDrift({ vendor_id })
  res.json(result)
}
