import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DELIVERY_MODULE } from "../../../../modules/delivery"
import type DeliveryService from "../../../../modules/delivery/service"

// POST /store/delivery/check-address   body: { tenant_id, lat?, lng?, postcode? }
// Returns the matching zone or null if not deliverable.

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(DELIVERY_MODULE) as DeliveryService
  const body = (req.body as any) || {}
  if (!body.tenant_id) return res.status(400).json({ error: "tenant_id required" })
  const zone = await svc.findZoneForAddress(body.tenant_id, {
    lat: body.lat,
    lng: body.lng,
    postcode: body.postcode,
  })
  if (!zone) return res.json({ deliverable: false })
  res.json({
    deliverable: true,
    zone: {
      id: zone.id,
      name: zone.name,
      delivery_fee_cents: zone.delivery_fee_cents,
      min_order_cents: zone.min_order_cents,
    },
  })
}
