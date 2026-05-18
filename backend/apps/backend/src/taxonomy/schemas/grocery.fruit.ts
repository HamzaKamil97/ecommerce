import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.fruit", display_name: "Fruit", parent: "grocery",
  core_fields: [
    { key: "weight_kg", label: "Weight (kg)", type: "number", required: true, min: 0.05, max: 20 },
    { key: "origin", label: "Origin", type: "string", required: false },
    { key: "is_organic", label: "Organic", type: "boolean", required: false },
  ],
}
