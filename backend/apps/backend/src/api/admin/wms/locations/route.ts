import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// PUT /admin/wms/locations  body: { vendor_id, lat, lng, delivery_radius_km?, address_text? }
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as any
  const { vendor_id, lat, lng, delivery_radius_km, address_text } = body
  if (!vendor_id || lat == null || lng == null) {
    return res.status(400).json({ error: "vendor_id, lat, lng required" })
  }
  const svc: any = req.scope.resolve("wmsService")
  await svc.upsertShopLocation({
    vendor_id,
    lat: Number(lat),
    lng: Number(lng),
    delivery_radius_km: delivery_radius_km ?? 5,
    address_text,
  })
  res.json({ ok: true })
}
