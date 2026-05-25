import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /store/wms/shops-nearby?lat=&lng=&radius_km=10
//   → { shops: ShopLocationResult[] }
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  const radius_km = Number(req.query.radius_km ?? 10)
  if (!isFinite(lat) || !isFinite(lng)) {
    return res.status(400).json({ error: "lat and lng required" })
  }
  const svc: any = req.scope.resolve("wmsService")
  const shops = await svc.shopsWithinRadius({ lat, lng, radius_km })
  res.json({ shops })
}
