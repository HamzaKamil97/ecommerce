import { model } from "@medusajs/framework/utils"

// Tracks Medusa orders being pushed to a POS system for fulfillment / record keeping.
export const OrderExportLog = model.define("order_export_log", {
  id: model.id().primaryKey(),
  medusa_order_id: model.text().searchable(),
  pos_provider: model.text(),
  pos_order_id: model.text().nullable(),
  status: model.enum(["pending", "success", "failed"]),
  error_message: model.text().nullable(),
  attempts: model.number().default(0),
  last_attempt_at: model.dateTime().nullable(),
}).indexes([
  { on: ["medusa_order_id", "pos_provider"], unique: true },
  { on: ["status"] },
])
