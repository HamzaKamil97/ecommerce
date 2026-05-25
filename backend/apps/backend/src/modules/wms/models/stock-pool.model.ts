import { model } from "@medusajs/framework/utils"

// One row per (vendor, variant) pair. Tracks on-hand and reserved quantities
// across the vendor's stock pool. Used by the WMS module for inventory
// reservation and movement bookkeeping.
export const StockPool = model.define("wms_stock_pool", {
  id: model.id({ prefix: "sp" }).primaryKey(),
  vendor_id: model.text().searchable(),
  variant_id: model.text().searchable(),
  on_hand_qty: model.bigNumber().default(0),
  reserved_qty: model.bigNumber().default(0),
  last_movement_at: model.dateTime().nullable(),
}).indexes([
  {
    name: "uniq_pool_per_vendor_variant",
    on: ["vendor_id", "variant_id"],
    unique: true,
  },
  { on: ["vendor_id"] },
])
