import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PAYMENTS_MODULE } from "../../../../modules/payments"
import type PaymentsService from "../../../../modules/payments/service"

// POST /store/payments/initiate
// body: { provider, cart_id?, order_id?, amount_cents, currency, customer_email?, customer_phone?, success_url, failure_url }
// → { redirect_url? | client_token?, provider_ref }

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PAYMENTS_MODULE) as PaymentsService
  const body = (req.body as any) || {}
  if (!body.provider) return res.status(400).json({ error: "provider required" })
  if (!body.amount_cents) return res.status(400).json({ error: "amount_cents required" })
  if (!body.currency) return res.status(400).json({ error: "currency required" })

  try {
    const customerId = (req as any).auth_context?.actor_id
    const out = await svc.initiatePayment(body.provider, body, customerId)
    res.json(out)
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "init failed" })
  }
}
