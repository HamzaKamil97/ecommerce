import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.snack", display_name: "Snack", parent: "grocery",
  core_fields: [
    { key: "weight_g", label: "Weight (g)", type: "number", required: true, min: 10, max: 2000 },
    { key: "snack_type", label: "Type", type: "enum", required: false, options: ["chips", "nuts", "sweets", "biscuit"] },
    { key: "flavor", label: "Flavor", type: "string", required: false },
  ],
}
