import { model } from "@medusajs/framework/utils"

// Maps a Medusa product variant to its counterpart in an external POS system.
// One variant ↔ one POS record per POS provider.
export const SkuMapping = model.define("sku_mapping", {
  id: model.id().primaryKey(),
  medusa_variant_id: model.text().searchable(),
  sku: model.text().searchable(),
  pos_provider: model.text(), // e.g. "square", "tap", "custom-local"
  pos_product_id: model.text().nullable(),
  pos_variant_id: model.text().nullable(),
  last_synced_at: model.dateTime().nullable(),
}).indexes([
  { on: ["medusa_variant_id", "pos_provider"], unique: true },
  { on: ["sku", "pos_provider"] },
])
