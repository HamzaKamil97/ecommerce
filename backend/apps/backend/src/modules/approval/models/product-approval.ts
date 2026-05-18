import { model } from "@medusajs/framework/utils"

// Tracks approval state for each Medusa product. One row per product.
// Admin-created products default to "approved"; vendor-created default to "draft".
export const ProductApproval = model.define("product_approval", {
  id: model.id().primaryKey(),
  product_id: model.text().searchable(),
  approval_status: model.enum([
    "draft",
    "pending_review",
    "approved",
    "rejected",
  ]).default("draft"),
  approval_note: model.text().nullable(),
  submitted_by_vendor_id: model.text().nullable(),
  approved_by_user_id: model.text().nullable(),
  approved_at: model.dateTime().nullable(),
  rejected_by_user_id: model.text().nullable(),
  rejected_at: model.dateTime().nullable(),
}).indexes([
  { on: ["product_id"], unique: true },
  { on: ["approval_status"] },
])
