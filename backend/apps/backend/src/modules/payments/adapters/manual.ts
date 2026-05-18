import type { PaymentProvider, InitiateInput, VerifyInput, RefundInput } from "./types"

// Cash on delivery / wire transfer / pay-later. No external API.
// Order is placed immediately as "not paid"; vendor confirms collection later from vendor portal.
export class ManualAdapter implements PaymentProvider {
  readonly id = "manual"
  readonly label = "Cash on delivery"
  readonly accepted_currencies = ["IQD", "USD", "EUR", "AED", "SAR"]

  async initiate(input: InitiateInput) {
    return {
      provider_ref: `manual-${input.order_id ?? input.cart_id}-${Date.now()}`,
      status: "initiated" as const,
    }
  }

  async verify(_input: VerifyInput) {
    return { ok: true, amount_cents: 0 }
  }

  async refund(_input: RefundInput) {
    return { ok: true }
  }
}
