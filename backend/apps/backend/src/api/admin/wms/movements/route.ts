import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /admin/wms/movements?vendor_id=&variant_id?=  → most recent 200 movements (audit log)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  const variant_id = req.query.variant_id as string | undefined
  if (!vendor_id) {
    return res.status(400).json({ error: "vendor_id required" })
  }
  const filter: any = { vendor_id }
  if (variant_id) filter.variant_id = variant_id
  const svc: any = req.scope.resolve("wmsService")
  const movements = await svc.listMovements(filter, {
    order: { created_at: "DESC" },
    take: 200,
  })
  res.json({ movements })
}
