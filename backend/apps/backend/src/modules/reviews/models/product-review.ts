import { model } from "@medusajs/framework/utils"

// Customer review of a product purchased in an order.
export const ProductReview = model.define("product_review", {
  id: model.id().primaryKey(),
  product_id: model.text().searchable(),
  customer_id: model.text().searchable(),
  order_id: model.text().nullable(),
  rating: model.number(),               // 1-5
  title: model.text().nullable(),
  body: model.text().nullable(),
  images: model.json().nullable(),      // string[] urls
  is_verified_purchase: model.boolean().default(false),
  status: model.enum(["pending", "approved", "rejected", "hidden"]).default("approved"),
  helpful_count: model.number().default(0),
  vendor_reply: model.text().nullable(),
  vendor_reply_at: model.dateTime().nullable(),
}).indexes([
  { on: ["product_id", "status"] },
  { on: ["customer_id"] },
  { on: ["rating"] },
])
