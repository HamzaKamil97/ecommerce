import { model } from "@medusajs/framework/utils"

// Discount codes. Platform-wide (tenant_id null) or per-tenant.
export const PromoCode = model.define("promo_code", {
  id: model.id().primaryKey(),
  code: model.text().searchable(),
  description: model.text().nullable(),
  tenant_id: model.text().nullable(),       // null = platform-wide
  discount_type: model.enum(["percent", "fixed_amount", "free_shipping"]),
  percent_off: model.number().nullable(),   // 0-100
  amount_off_cents: model.number().nullable(),
  currency_code: model.text().nullable(),
  min_subtotal_cents: model.number().nullable(),
  max_redemptions: model.number().nullable(),
  redemptions_count: model.number().default(0),
  valid_from: model.dateTime().nullable(),
  valid_until: model.dateTime().nullable(),
  is_active: model.boolean().default(true),
}).indexes([
  { on: ["code"], unique: true },
  { on: ["tenant_id"] },
])
