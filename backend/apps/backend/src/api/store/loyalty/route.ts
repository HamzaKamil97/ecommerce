import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../modules/loyalty"
import type LoyaltyService from "../../../modules/loyalty/service"

// GET  /store/loyalty              → my points balance, tier, referral code

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(LOYALTY_MODULE) as LoyaltyService
  const customerId = (req as any).auth_context?.actor_id ?? String(req.query.customer_id ?? "")
  if (!customerId) return res.status(401).json({ error: "Authentication required" })
  await svc.getOrCreate(customerId) // auto-provision on first read
  const stats = await svc.getBalance(customerId)
  res.json(stats)
}
