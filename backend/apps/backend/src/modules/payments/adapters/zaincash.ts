import type { PaymentProvider, InitiateInput, VerifyInput, RefundInput } from "./types"

// ZainCash — Iraq's most popular mobile wallet.
// Docs: https://docs.zaincash.iq/  (v2, updated Jan 2026)
//
// Flow:
// 1. OAuth client_credentials → access_token
// 2. POST /api/v2/payment-gateway/transaction/init → redirectUrl
// 3. Customer pays via mobile (OTP)
// 4. Callback on successUrl with ?token=<jwt>
// 5. Verify JWT signature with ZAINCASH_PUBLIC_KEY

export class ZainCashAdapter implements PaymentProvider {
  readonly id = "zaincash"
  readonly label = "ZainCash"
  readonly icon_url = "https://zaincash.iq/assets/logo.png"
  readonly accepted_currencies = ["IQD"]

  private base = process.env.ZAINCASH_BASE_URL ?? "https://api.zaincash.iq"

  private async getToken(): Promise<string> {
    const res = await fetch(`${this.base}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.ZAINCASH_CLIENT_ID ?? "",
        client_secret: process.env.ZAINCASH_CLIENT_SECRET ?? "",
      }),
    })
    if (!res.ok) throw new Error(`zaincash oauth: ${res.status}`)
    const data: any = await res.json()
    return data.access_token
  }

  async initiate(input: InitiateInput) {
    if (!process.env.ZAINCASH_CLIENT_ID) {
      // Stub mode for development without real credentials.
      return {
        redirect_url: `${input.success_url}?stub_provider=zaincash&token=stub.${Date.now()}`,
        provider_ref: `stub-${Date.now()}`,
        status: "pending_user_action" as const,
      }
    }

    const token = await this.getToken()
    const res = await fetch(`${this.base}/api/v2/payment-gateway/transaction/init`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amount_cents / 100,
        currency: "IQD",
        orderId: input.order_id ?? input.cart_id,
        serviceType: "ecommerce",
        msisdn: input.customer_phone,
        redirectUrl: input.success_url,
        cancelUrl: input.failure_url,
      }),
    })
    if (!res.ok) throw new Error(`zaincash init: ${res.status}`)
    const data: any = await res.json()
    return {
      redirect_url: data.redirectUrl ?? data.payment_url,
      provider_ref: data.transactionId ?? data.id,
      status: "pending_user_action" as const,
    }
  }

  async verify(input: VerifyInput) {
    if (!input.jwt) return { ok: false, amount_cents: 0, error: "missing jwt" }
    // Stub mode — accept any JWT-shaped token for dev.
    if (!process.env.ZAINCASH_PUBLIC_KEY || input.jwt.startsWith("stub.")) {
      return { ok: true, amount_cents: 0 }
    }
    // Real verification — needs `jsonwebtoken` package (npm i jsonwebtoken).
    // const jwt = require("jsonwebtoken")
    // const decoded: any = jwt.verify(input.jwt, process.env.ZAINCASH_PUBLIC_KEY, { algorithms: ["RS256"] })
    // return { ok: decoded.status === "success", amount_cents: Math.round(decoded.amount * 100) }
    return { ok: false, amount_cents: 0, error: "JWT verification not configured" }
  }

  async refund(_input: RefundInput) {
    // ZainCash refund flow requires their support team historically; programmatic refund TBD.
    return { ok: false, error: "refund must be done manually via ZainCash dashboard" }
  }
}
