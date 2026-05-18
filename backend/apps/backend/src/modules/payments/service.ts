import { MedusaService } from "@medusajs/framework/utils"
import { PaymentAttempt } from "./models/payment-attempt"
import { ManualAdapter } from "./adapters/manual"
import { ZainCashAdapter } from "./adapters/zaincash"
import { QiCardAdapter } from "./adapters/qicard"
import { AsiaPayAdapter } from "./adapters/asiapay"
import { StripeAdapter } from "./adapters/stripe"
import type { PaymentProvider, InitiateInput, VerifyInput } from "./adapters/types"

class PaymentsService extends MedusaService({
  PaymentAttempt,
}) {
  private providers = new Map<string, PaymentProvider>()

  constructor() {
    super(...(arguments as unknown as [any]))
    this.registerProvider(new ManualAdapter())
    this.registerProvider(new ZainCashAdapter())
    this.registerProvider(new QiCardAdapter())
    this.registerProvider(new AsiaPayAdapter())
    this.registerProvider(new StripeAdapter())
  }

  registerProvider(p: PaymentProvider) {
    this.providers.set(p.id, p)
  }

  listProviders(currencyCode?: string) {
    return Array.from(this.providers.values())
      .filter((p) => !currencyCode || p.accepted_currencies.includes(currencyCode.toUpperCase()))
      .map((p) => ({
        id: p.id,
        label: p.label,
        icon_url: p.icon_url ?? null,
        accepted_currencies: p.accepted_currencies,
      }))
  }

  getProvider(id: string): PaymentProvider {
    const p = this.providers.get(id)
    if (!p) throw new Error(`Unknown payment provider: ${id}`)
    return p
  }

  async initiatePayment(providerId: string, input: InitiateInput, customerId?: string) {
    const provider = this.getProvider(providerId)
    const result = await provider.initiate(input)
    await (this as any).createPaymentAttempts({
      order_id: input.order_id ?? null,
      cart_id: input.cart_id ?? null,
      customer_id: customerId ?? null,
      provider: providerId,
      provider_ref: result.provider_ref,
      amount_cents: input.amount_cents,
      currency_code: input.currency,
      status: result.status === "pending_user_action" ? "pending_user_action" : "initiated",
    })
    return result
  }

  async verifyAndComplete(providerId: string, input: VerifyInput) {
    const provider = this.getProvider(providerId)
    const out = await provider.verify(input)
    const [attempt] = await this.listPaymentAttempts({
      provider: providerId as any,
      provider_ref: input.provider_ref,
    })
    if (attempt) {
      await (this as any).updatePaymentAttempts({
        id: attempt.id,
        status: out.ok ? "succeeded" : "failed",
        error: out.error ?? null,
      })
    }
    return out
  }
}

export default PaymentsService
