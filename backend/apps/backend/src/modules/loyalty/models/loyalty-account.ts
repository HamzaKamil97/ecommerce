import { model } from "@medusajs/framework/utils"

// One per customer. Tracks lifetime points + current tier.
export const LoyaltyAccount = model.define("loyalty_account", {
  id: model.id().primaryKey(),
  customer_id: model.text().searchable(),
  points_balance: model.number().default(0),
  lifetime_points: model.number().default(0),
  tier: model.enum(["bronze", "silver", "gold", "platinum"]).default("bronze"),
  referral_code: model.text().nullable(),
}).indexes([
  { on: ["customer_id"], unique: true },
  { on: ["referral_code"], unique: true },
])
