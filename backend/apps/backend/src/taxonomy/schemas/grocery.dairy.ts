import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.dairy", display_name: "Dairy", parent: "grocery",
  core_fields: [
    { key: "volume_ml", label: "Volume (ml)", type: "number", required: false, min: 50 },
    { key: "weight_g", label: "Weight (g)", type: "number", required: false, min: 50 },
    { key: "fat_percent", label: "Fat %", type: "number", required: false, min: 0, max: 100 },
    { key: "dairy_type", label: "Type", type: "enum", required: true, options: ["milk", "yogurt", "cheese", "butter", "cream"] },
  ],
}
