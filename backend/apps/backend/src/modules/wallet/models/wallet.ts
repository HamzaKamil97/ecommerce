import { model } from "@medusajs/framework/utils"

// One wallet per customer per currency.
export const Wallet = model.define("wallet", {
  id: model.id().primaryKey(),
  customer_id: model.text().searchable(),
  currency_code: model.text(),
  balance_cents: model.number().default(0),
  is_frozen: model.boolean().default(false),
}).indexes([
  { on: ["customer_id", "currency_code"], unique: true },
])
