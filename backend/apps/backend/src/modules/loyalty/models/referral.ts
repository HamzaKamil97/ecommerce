import { model } from "@medusajs/framework/utils"

// Records who referred whom. Triggers bonus on first order of the referred customer.
export const Referral = model.define("referral", {
  id: model.id().primaryKey(),
  referrer_customer_id: model.text().searchable(),
  referred_customer_id: model.text().searchable(),
  referral_code: model.text(),
  status: model.enum(["pending_first_order", "fulfilled", "expired"]).default("pending_first_order"),
  bonus_paid_at: model.dateTime().nullable(),
}).indexes([
  { on: ["referrer_customer_id"] },
  { on: ["referred_customer_id"], unique: true },
])
