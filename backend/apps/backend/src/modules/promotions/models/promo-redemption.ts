import { model } from "@medusajs/framework/utils"

// Audit each promo usage.
export const PromoRedemption = model.define("promo_redemption", {
  id: model.id().primaryKey(),
  promo_code_id: model.text().searchable(),
  customer_id: model.text().searchable(),
  order_id: model.text().nullable(),
  discount_applied_cents: model.number(),
}).indexes([
  { on: ["promo_code_id"] },
  { on: ["customer_id"] },
])
