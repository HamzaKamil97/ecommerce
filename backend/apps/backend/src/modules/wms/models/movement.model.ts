import { model } from "@medusajs/framework/utils"

export const MOVEMENT_TYPES = ["sale", "pick", "manual", "restock", "adjustment", "release"] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

// Append-only audit log of every stock movement (sale, pick, restock,
// manual adjustment, release). One row per change; never updated in place.
export const Movement = model.define("wms_movement", {
  id: model.id({ prefix: "mv" }).primaryKey(),
  vendor_id: model.text().searchable(),
  variant_id: model.text().searchable(),
  type: model.enum(MOVEMENT_TYPES),
  qty_delta: model.bigNumber(),
  source_id: model.text().nullable(),
  actor_id: model.text().nullable(),
  note: model.text().nullable(),
}).indexes([
  { on: ["vendor_id", "created_at"] },
  { on: ["vendor_id", "variant_id", "created_at"] },
])
