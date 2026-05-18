import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../modules/loyalty"
import type LoyaltyService from "../../../../modules/loyalty/service"

// POST /store/loyalty/refer    body: { referral_code }
// Apply a referral code at signup time. New customer gets welcome bonus.

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(LOYALTY_MODULE) as LoyaltyService
  const body = (req.body as any) || {}
  const customerId = (req as any).auth_context?.actor_id ?? body.customer_id
  if (!customerId) return res.status(401).json({ error: "Authentication required" })
  if (!body.referral_code) return res.status(400).json({ error: "referral_code required" })
  try {
    const ref = await svc.createReferral(body.referral_code, customerId)
    res.status(201).json({ referral: ref })
  } catch (e: any) {
    res.status(400).json({ error: e?.message })
  }
}
