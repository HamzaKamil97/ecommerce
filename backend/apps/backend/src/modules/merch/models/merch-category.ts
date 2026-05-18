import { model } from "@medusajs/framework/utils"

// A MerchCategory is a per-shop browse bucket (e.g., "Pizzas", "Burgers"
// inside Hamza's Kitchen). Decoupled from the global taxonomy. Flat per shop
// in v0 — no nesting. Soft-deletable.
export const MerchCategory = model.define("merch_category", {
  id: model.id().primaryKey(),
  tenant_id: model.text(),
  handle: model.text(),
  name: model.text(),
  position: model.number().default(0),
  icon_url: model.text().nullable(),
}).indexes([
  { on: ["tenant_id", "handle"], unique: true },
  { on: ["tenant_id"] },
])
