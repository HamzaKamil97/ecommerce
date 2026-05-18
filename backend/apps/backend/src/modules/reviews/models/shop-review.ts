import { model } from "@medusajs/framework/utils"

// Customer review of a tenant/shop overall (delivery speed, accuracy, etc.)
export const ShopReview = model.define("shop_review", {
  id: model.id().primaryKey(),
  tenant_id: model.text().searchable(),
  customer_id: model.text().searchable(),
  order_id: model.text().nullable(),
  rating: model.number(),               // 1-5
  delivery_rating: model.number().nullable(),  // 1-5
  packaging_rating: model.number().nullable(),
  accuracy_rating: model.number().nullable(),
  body: model.text().nullable(),
  status: model.enum(["pending", "approved", "rejected", "hidden"]).default("approved"),
}).indexes([
  { on: ["tenant_id"] },
  { on: ["customer_id"] },
])
