import { MedusaService } from "@medusajs/framework/utils"
import { PromoCode } from "./models/promo-code"
import { PromoRedemption } from "./models/promo-redemption"

class PromotionsService extends MedusaService({
  PromoCode,
  PromoRedemption,
}) {
  async findByCode(code: string) {
    const [row] = await this.listPromoCodes({ code: code.toUpperCase() })
    return row ?? null
  }

  /**
   * Returns the discount in cents to apply, or { error } if invalid.
   * Does NOT mutate the promo — only previews. Call redeem() on order placement.
   */
  async validate(code: string, input: { subtotal_cents: number; tenant_id?: string; customer_id?: string; currency: string }) {
    const promo = await this.findByCode(code)
    if (!promo || !promo.is_active) return { ok: false, error: "Invalid code" }

    const now = new Date()
    if (promo.valid_from && new Date(promo.valid_from) > now) return { ok: false, error: "Not yet valid" }
    if (promo.valid_until && new Date(promo.valid_until) < now) return { ok: false, error: "Expired" }

    if (promo.tenant_id && input.tenant_id && promo.tenant_id !== input.tenant_id) {
      return { ok: false, error: "Not valid for this shop" }
    }

    if (promo.min_subtotal_cents && input.subtotal_cents < promo.min_subtotal_cents) {
      return { ok: false, error: `Minimum subtotal: ${promo.min_subtotal_cents / 100}` }
    }

    if (promo.max_redemptions && promo.redemptions_count >= promo.max_redemptions) {
      return { ok: false, error: "Maximum uses reached" }
    }

    let discount_cents = 0
    if (promo.discount_type === "percent" && promo.percent_off) {
      discount_cents = Math.floor((input.subtotal_cents * promo.percent_off) / 100)
    } else if (promo.discount_type === "fixed_amount" && promo.amount_off_cents) {
      discount_cents = Math.min(promo.amount_off_cents, input.subtotal_cents)
    } else if (promo.discount_type === "free_shipping") {
      discount_cents = 0  // shipping handled separately
    }

    return { ok: true, promo, discount_cents, type: promo.discount_type }
  }

  async redeem(code: string, customerId: string, orderId: string, discountAppliedCents: number) {
    const promo = await this.findByCode(code)
    if (!promo) return null
    await (this as any).createPromoRedemptions({
      promo_code_id: promo.id,
      customer_id: customerId,
      order_id: orderId,
      discount_applied_cents: discountAppliedCents,
    })
    await (this as any).updatePromoCodes({
      id: promo.id,
      redemptions_count: promo.redemptions_count + 1,
    })
    return promo
  }
}

export default PromotionsService
