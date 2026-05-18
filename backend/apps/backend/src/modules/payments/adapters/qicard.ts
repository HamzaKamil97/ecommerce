import type { PaymentProvider, InitiateInput, VerifyInput, RefundInput } from "./types"
import * as crypto from "crypto"

// QiCard — Iraq's dominant card system, government salary cards, growing ecommerce.
// Docs: https://developers-gate.qi.iq/

export class QiCardAdapter implements PaymentProvider {
  readonly id = "qicard"
  readonly label = "Qi Card"
  readonly accepted_currencies = ["IQD", "USD"]

  private base = process.env.QICARD_BASE_URL ?? "https://developers-gate.qi.iq"

  async initiate(input: InitiateInput) {
    if (!process.env.QICARD_MERCHANT_ID) {
      // Stub mode
      return {
        redirect_url: `${input.success_url}?stub_provider=qicard&token=stub-qi-${Date.now()}`,
        provider_ref: `stub-qi-${Date.now()}`,
        status: "pending_user_action" as const,
      }
    }

    const res = await fetch(`${this.base}/api/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Merchant-Id": process.env.QICARD_MERCHANT_ID,
        "X-Api-Key": process.env.QICARD_API_KEY ?? "",
      },
      body: JSON.stringify({
        amount: input.amount_cents,
        currency: input.currency,
        order_id: input.order_id ?? input.cart_id,
        callback_url: input.success_url,
        cancel_url: input.failure_url,
        customer: { email: input.customer_email, phone: input.customer_phone },
      }),
    })
    if (!res.ok) throw new Error(`qicard init: ${res.status}`)
    const data: any = await res.json()
    return {
      redirect_url: data.payment_url ?? data.redirect_url,
      provider_ref: data.transaction_id ?? data.id,
      status: "pending_user_action" as const,
    }
  }

  async verify(input: VerifyInput) {
    if (!process.env.QICARD_HMAC_SECRET) {
      return { ok: true, amount_cents: 0 }  // stub
    }
    if (!input.raw_body || !input.signature) {
      return { ok: false, amount_cents: 0, error: "missing body or signature" }
    }
    const expected = crypto
      .createHmac("sha256", process.env.QICARD_HMAC_SECRET)
      .update(typeof input.raw_body === "string" ? input.raw_body : JSON.stringify(input.raw_body))
      .digest("hex")
    if (expected !== input.signature) return { ok: false, amount_cents: 0, error: "bad signature" }

    const body = typeof input.raw_body === "string" ? JSON.parse(input.raw_body) : input.raw_body
    return { ok: body.status === "success", amount_cents: body.amount ?? 0 }
  }

  async refund(input: RefundInput) {
    if (!process.env.QICARD_MERCHANT_ID) return { ok: false, error: "not configured" }
    const res = await fetch(`${this.base}/api/transactions/${input.provider_ref}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Merchant-Id": process.env.QICARD_MERCHANT_ID,
        "X-Api-Key": process.env.QICARD_API_KEY ?? "",
      },
      body: JSON.stringify({ amount: input.amount_cents }),
    })
    return { ok: res.ok, error: res.ok ? undefined : `qicard refund: ${res.status}` }
  }
}
