import { MedusaService } from "@medusajs/framework/utils"
import { LoyaltyAccount } from "./models/loyalty-account"
import { LoyaltyEvent } from "./models/loyalty-event"
import { Referral } from "./models/referral"

const POINTS_PER_DOLLAR = 10  // 10 points per $1 spent
const TIER_THRESHOLDS = { silver: 1000, gold: 5000, platinum: 20000 }
const REFERRER_BONUS = 500
const REFEREE_WELCOME = 200

class LoyaltyService extends MedusaService({
  LoyaltyAccount,
  LoyaltyEvent,
  Referral,
}) {
  async getOrCreate(customerId: string) {
    const [existing] = await this.listLoyaltyAccounts({ customer_id: customerId })
    if (existing) return existing
    const code = "REF" + customerId.slice(-6).toUpperCase()
    return (this as any).createLoyaltyAccounts({
      customer_id: customerId,
      referral_code: code,
    })
  }

  async awardPointsForOrder(customerId: string, orderTotalCents: number, orderId: string) {
    const acct = await this.getOrCreate(customerId)
    const points = Math.floor((orderTotalCents / 100) * POINTS_PER_DOLLAR)
    if (points <= 0) return acct
    return this._applyDelta(acct, points, "order_completed", "order", orderId, `Earned from order #${orderId}`)
  }

  async redeemPoints(customerId: string, points: number, orderId: string) {
    const acct = await this.getOrCreate(customerId)
    if (acct.points_balance < points) throw new Error("Insufficient points")
    return this._applyDelta(acct, -points, "redeem", "order", orderId, `Redeemed ${points} points`)
  }

  private async _applyDelta(acct: any, delta: number, reason: string, refType?: string | null, refId?: string | null, description?: string) {
    const newBalance = acct.points_balance + delta
    const newLifetime = delta > 0 ? acct.lifetime_points + delta : acct.lifetime_points
    let newTier = acct.tier
    if (newLifetime >= TIER_THRESHOLDS.platinum) newTier = "platinum"
    else if (newLifetime >= TIER_THRESHOLDS.gold) newTier = "gold"
    else if (newLifetime >= TIER_THRESHOLDS.silver) newTier = "silver"

    const tierChanged = newTier !== acct.tier
    await (this as any).updateLoyaltyAccounts({
      id: acct.id,
      points_balance: newBalance,
      lifetime_points: newLifetime,
      tier: newTier,
    })
    await (this as any).createLoyaltyEvents({
      loyalty_account_id: acct.id,
      delta,
      reason,
      reference_type: refType ?? null,
      reference_id: refId ?? null,
      description: description ?? null,
      balance_after: newBalance,
    })
    if (tierChanged && delta > 0) {
      await (this as any).createLoyaltyEvents({
        loyalty_account_id: acct.id,
        delta: 0,
        reason: "tier_promotion",
        description: `Promoted to ${newTier}`,
        balance_after: newBalance,
      })
    }
    return { ...acct, points_balance: newBalance, lifetime_points: newLifetime, tier: newTier }
  }

  // ===== Referrals =====

  async createReferral(referralCode: string, newCustomerId: string) {
    const [referrerAcct] = await this.listLoyaltyAccounts({ referral_code: referralCode })
    if (!referrerAcct) throw new Error("Invalid referral code")
    if (referrerAcct.customer_id === newCustomerId) throw new Error("Cannot refer yourself")

    // Check if this new customer already has a referral row
    const existing = await this.listReferrals({ referred_customer_id: newCustomerId })
    if (existing.length > 0) return existing[0]

    const ref = await (this as any).createReferrals({
      referrer_customer_id: referrerAcct.customer_id,
      referred_customer_id: newCustomerId,
      referral_code: referralCode,
      status: "pending_first_order",
    })

    // Immediate welcome bonus for new customer
    const newAcct = await this.getOrCreate(newCustomerId)
    await this._applyDelta(newAcct, REFEREE_WELCOME, "referral_signup", "referral", ref.id, "Welcome bonus")

    return ref
  }

  /** Called by subscriber when referred customer places their first order. */
  async fulfillReferralOnFirstOrder(customerId: string, orderId: string) {
    const [ref] = await this.listReferrals({ referred_customer_id: customerId, status: "pending_first_order" })
    if (!ref) return null

    // Award referrer
    const [referrerAcct] = await this.listLoyaltyAccounts({ customer_id: ref.referrer_customer_id })
    if (referrerAcct) {
      await this._applyDelta(referrerAcct, REFERRER_BONUS, "referral_first_order", "referral", ref.id, "Friend's first order")
    }

    await (this as any).updateReferrals({
      id: ref.id,
      status: "fulfilled",
      bonus_paid_at: new Date(),
    })

    return ref
  }

  async getBalance(customerId: string) {
    const [acct] = await this.listLoyaltyAccounts({ customer_id: customerId })
    return acct ? { points: acct.points_balance, tier: acct.tier, referral_code: acct.referral_code } : { points: 0, tier: "bronze", referral_code: null }
  }
}

export default LoyaltyService
