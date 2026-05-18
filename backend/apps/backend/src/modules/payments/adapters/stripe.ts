import type { PaymentProvider, InitiateInput, VerifyInput, RefundInput } from "./types"

// Stripe — international Visa/Mastercard, expat shoppers, premium cards.
// For production: install @medusajs/payment-stripe and use Medusa's native integration.
// This adapter is a thin wrapper that creates a PaymentIntent and returns the client_secret.

export class StripeAdapter implements PaymentProvider {
  readonly id = "stripe"
  readonly label = "Card (Visa / Mastercard)"
  readonly accepted_currencies = ["USD", "EUR", "AED", "SAR", "IQD"]

  async initiate(input: InitiateInput) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        client_token: `pi_stub_${Date.now()}_secret_stub`,
        provider_ref: `stub-stripe-${Date.now()}`,
        status: "pending_user_action" as const,
      }
    }

    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(input.amount_cents),
        currency: input.currency.toLowerCase(),
        "automatic_payment_methods[enabled]": "true",
        "metadata[order_id]": input.order_id ?? "",
        "metadata[cart_id]": input.cart_id ?? "",
        receipt_email: input.customer_email ?? "",
      }),
    })
    if (!res.ok) throw new Error(`stripe: ${res.status} ${await res.text()}`)
    const data: any = await res.json()
    return {
      client_token: data.client_secret,
      provider_ref: data.id,
      status: "pending_user_action" as const,
    }
  }

  async verify(input: VerifyInput) {
    if (!process.env.STRIPE_SECRET_KEY) return { ok: true, amount_cents: 0 }
    const res = await fetch(`https://api.stripe.com/v1/payment_intents/${input.provider_ref}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    })
    if (!res.ok) return { ok: false, amount_cents: 0, error: `stripe verify: ${res.status}` }
    const data: any = await res.json()
    return {
      ok: data.status === "succeeded",
      amount_cents: data.amount_received ?? 0,
      error: data.status !== "succeeded" ? `status=${data.status}` : undefined,
    }
  }

  async refund(input: RefundInput) {
    if (!process.env.STRIPE_SECRET_KEY) return { ok: false, error: "not configured" }
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        payment_intent: input.provider_ref,
        amount: String(input.amount_cents),
      }),
    })
    return { ok: res.ok, error: res.ok ? undefined : await res.text() }
  }
}
