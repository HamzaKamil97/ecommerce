import { model } from "@medusajs/framework/utils"

// One row per payment initiation. Tracks the redirect flow + callback verification.
export const PaymentAttempt = model.define("payment_attempt", {
  id: model.id().primaryKey(),
  order_id: model.text().nullable(),
  cart_id: model.text().nullable(),
  customer_id: model.text().nullable(),
  provider: model.enum(["manual", "zaincash", "qicard", "asiapay", "stripe"]),
  provider_ref: model.text().nullable(),     // transaction id / charge id
  amount_cents: model.number(),
  currency_code: model.text(),
  status: model.enum([
    "initiated",
    "pending_user_action",
    "succeeded",
    "failed",
    "refunded",
    "expired",
  ]).default("initiated"),
  error: model.text().nullable(),
  metadata: model.json().nullable(),
}).indexes([
  { on: ["order_id"] },
  { on: ["cart_id"] },
  { on: ["provider", "provider_ref"] },
  { on: ["status"] },
])
