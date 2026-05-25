import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /admin/wms/reservations?vendor_id=  → most recent 100 reservations
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) {
    return res.status(400).json({ error: "vendor_id required" })
  }
  const svc: any = req.scope.resolve("wmsService")
  const reservations = await svc.listReservations(
    { vendor_id },
    { order: { created_at: "DESC" }, take: 100 },
  )
  res.json({ reservations })
}
