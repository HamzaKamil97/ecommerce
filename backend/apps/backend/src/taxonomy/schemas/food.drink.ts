import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "food.drink", display_name: "Drink", parent: "food",
  core_fields: [
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 30 },
    { key: "volume_ml", label: "Volume (ml)", type: "number", required: false, min: 50, max: 2000 },
    { key: "is_hot", label: "Hot drink", type: "boolean", required: false },
  ],
}
