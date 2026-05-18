import { model } from "@medusajs/framework/utils"

// Audit trail for inventory changes flowing between Medusa and POS.
export const InventorySyncLog = model.define("inventory_sync_log", {
  id: model.id().primaryKey(),
  source: model.enum(["medusa", "pos"]),
  pos_provider: model.text(),
  sku: model.text().searchable(),
  medusa_variant_id: model.text().nullable(),
  old_quantity: model.number().nullable(),
  new_quantity: model.number(),
  status: model.enum(["success", "failed", "retry"]),
  error_message: model.text().nullable(),
  attempts: model.number().default(1),
}).indexes([
  { on: ["sku", "pos_provider"] },
  { on: ["status"] },
])
