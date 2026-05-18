import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PROMOTIONS_MODULE } from "../../../modules/promotions"
import type PromotionsService from "../../../modules/promotions/service"

// GET  /admin/promotions          list all promo codes
// POST /admin/promotions          create new

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PROMOTIONS_MODULE) as PromotionsService
  const promos = await svc.listPromoCodes({}, { take: 200 })
  res.json({ promos, count: promos.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PROMOTIONS_MODULE) as PromotionsService
  const body = (req.body as any) || {}
  if (!body.code) return res.status(400).json({ error: "code required" })
  if (!body.discount_type) return res.status(400).json({ error: "discount_type required" })
  const created = await (svc as any).createPromoCodes({
    code: String(body.code).toUpperCase(),
    description: body.description ?? null,
    tenant_id: body.tenant_id ?? null,
    discount_type: body.discount_type,
    percent_off: body.percent_off ?? null,
    amount_off_cents: body.amount_off_cents ?? null,
    currency_code: body.currency_code ?? null,
    min_subtotal_cents: body.min_subtotal_cents ?? null,
    max_redemptions: body.max_redemptions ?? null,
    valid_from: body.valid_from ?? null,
    valid_until: body.valid_until ?? null,
    is_active: body.is_active ?? true,
  })
  res.status(201).json({ promo: created })
}
