import type { PaymentProvider, InitiateInput, VerifyInput, RefundInput } from "./types"
import * as crypto from "crypto"

// AsiaPay — card gateway serving Iraq (IQD).
// Integration: https://www.asiapay.iq/integration

export class AsiaPayAdapter implements PaymentProvider {
  readonly id = "asiapay"
  readonly label = "AsiaPay (Visa/Mastercard)"
  readonly accepted_currencies = ["IQD", "USD"]

  async initiate(input: InitiateInput) {
    if (!process.env.ASIAPAY_MERCHANT_ID) {
      return {
        redirect_url: `${input.success_url}?stub_provider=asiapay&token=stub-ap-${Date.now()}`,
        provider_ref: `stub-ap-${Date.now()}`,
        status: "pending_user_action" as const,
      }
    }

    const orderRef = input.order_id ?? input.cart_id ?? `ord-${Date.now()}`
    const merchantId = process.env.ASIAPAY_MERCHANT_ID
    const sig = crypto
      .createHmac("sha256", process.env.ASIAPAY_SECRET ?? "")
      .update(`${merchantId}|${orderRef}|${input.amount_cents}|${input.currency}`)
      .digest("hex")

    const params = new URLSearchParams({
      merchantId,
      orderRef,
      amount: String(input.amount_cents),
      currCode: input.currency === "IQD" ? "368" : "840",
      payType: "N",
      successUrl: input.success_url,
      failUrl: input.failure_url,
      cancelUrl: input.failure_url,
      signature: sig,
    })

    return {
      redirect_url: `https://www.asiapay.iq/PayGate/PaymentPage.aspx?${params.toString()}`,
      provider_ref: orderRef,
      status: "pending_user_action" as const,
    }
  }

  async verify(input: VerifyInput) {
    return { ok: !!input.signature, amount_cents: 0 }
  }

  async refund(_input: RefundInput) {
    return { ok: false, error: "AsiaPay refund: contact merchant support" }
  }
}
