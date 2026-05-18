import { model } from "@medusajs/framework/utils"

// Append-only ledger of points changes.
export const LoyaltyEvent = model.define("loyalty_event", {
  id: model.id().primaryKey(),
  loyalty_account_id: model.text().searchable(),
  delta: model.number(),                  // +/- points
  reason: model.enum([
    "order_completed",
    "referral_signup",
    "referral_first_order",
    "redeem",
    "manual_adjustment",
    "tier_promotion",
    "promo",
  ]),
  reference_type: model.text().nullable(),
  reference_id: model.text().nullable(),
  description: model.text().nullable(),
  balance_after: model.number(),
}).indexes([
  { on: ["loyalty_account_id"] },
  { on: ["reason"] },
])
