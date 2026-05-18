import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "food.pasta", display_name: "Pasta", parent: "food",
  core_fields: [
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 90 },
    { key: "sauce", label: "Sauce", type: "string", required: false },
    { key: "spice_level", label: "Spice level", type: "enum", required: false, options: ["none", "mild", "medium", "hot"] },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg"] },
  ],
}
