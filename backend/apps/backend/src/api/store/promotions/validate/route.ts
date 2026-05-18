import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PROMOTIONS_MODULE } from "../../../../modules/promotions"
import type PromotionsService from "../../../../modules/promotions/service"

// POST /store/promotions/validate    body: { code, subtotal_cents, currency, tenant_id? }
//   returns { ok, discount_cents, type } or { ok: false, error }

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PROMOTIONS_MODULE) as PromotionsService
  const body = (req.body as any) || {}
  if (!body.code) return res.status(400).json({ error: "code required" })
  const customerId = (req as any).auth_context?.actor_id
  const result = await svc.validate(body.code, {
    subtotal_cents: body.subtotal_cents ?? 0,
    tenant_id: body.tenant_id,
    customer_id: customerId,
    currency: body.currency ?? "IQD",
  })
  res.json(result)
}
