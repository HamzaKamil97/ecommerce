import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DELIVERY_MODULE } from "../../../../modules/delivery"
import type DeliveryService from "../../../../modules/delivery/service"

// GET /store/delivery/slots?tenant_id=...&days=7    Public: list available delivery slots for a tenant.

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(DELIVERY_MODULE) as DeliveryService
  const tenantId = String(req.query.tenant_id ?? "")
  const days = Math.min(14, Number(req.query.days ?? 7))
  if (!tenantId) return res.status(400).json({ error: "tenant_id required" })
  const slots = await svc.listAvailableSlots(tenantId, days)
  res.json({ slots, count: slots.length, tenant_id: tenantId, days })
}
