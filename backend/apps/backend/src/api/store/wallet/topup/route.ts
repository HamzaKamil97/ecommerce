import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WALLET_MODULE } from "../../../../modules/wallet"
import type WalletService from "../../../../modules/wallet/service"

// POST /store/wallet/topup        body: { amount_cents, currency?, payment_method? }
//
// Stub: in production, takes a Stripe Payment Intent / token, charges card, then credits wallet.

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(WALLET_MODULE) as WalletService
  const body = (req.body as any) || {}
  const customerId = (req as any).auth_context?.actor_id ?? body.customer_id
  if (!customerId) return res.status(401).json({ error: "Authentication required" })
  if (!body.amount_cents || body.amount_cents <= 0) return res.status(400).json({ error: "amount_cents required" })

  // TODO: integrate Stripe / Tap / HyperPay here.
  const result = await svc.credit(
    customerId,
    body.amount_cents,
    "topup",
    "stripe",
    body.payment_intent_id,
    "Wallet top-up",
    body.currency ?? "usd"
  )
  res.json(result)
}
