import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.bakery", display_name: "Bakery", parent: "grocery",
  core_fields: [
    { key: "weight_g", label: "Weight (g)", type: "number", required: true, min: 50, max: 5000 },
    { key: "bakery_type", label: "Type", type: "enum", required: false, options: ["bread", "pastry", "cake", "biscuit"] },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "nuts"] },
  ],
}
