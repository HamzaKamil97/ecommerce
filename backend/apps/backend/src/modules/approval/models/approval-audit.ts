import { model } from "@medusajs/framework/utils"

// Append-only log of every state transition.
export const ApprovalAudit = model.define("approval_audit", {
  id: model.id().primaryKey(),
  product_id: model.text().searchable(),
  actor_user_id: model.text().nullable(),
  action: model.enum([
    "product_created",
    "submitted_for_review",
    "approved",
    "rejected",
    "edited_after_rejection",
    "resubmitted",
    "overridden",
  ]),
  old_status: model.text().nullable(),
  new_status: model.text().nullable(),
  note: model.text().nullable(),
}).indexes([
  { on: ["product_id"] },
  { on: ["action"] },
])
