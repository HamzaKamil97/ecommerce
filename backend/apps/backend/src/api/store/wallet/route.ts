import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WALLET_MODULE } from "../../../modules/wallet"
import type WalletService from "../../../modules/wallet/service"

// GET /store/wallet              → balance + recent transactions

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(WALLET_MODULE) as WalletService
  const customerId = (req as any).auth_context?.actor_id ?? String(req.query.customer_id ?? "")
  if (!customerId) return res.status(401).json({ error: "Authentication required" })
  const currency = String(req.query.currency ?? "usd")
  const balance = await svc.getBalance(customerId, currency)
  const transactions = await svc.listTransactions(customerId, 50, currency)
  res.json({ balance_cents: balance, currency_code: currency, transactions })
}
