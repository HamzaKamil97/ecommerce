import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "food.salad", display_name: "Salad", parent: "food",
  core_fields: [
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 60 },
    { key: "dressing", label: "Dressing", type: "string", required: false },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "nuts", "fish"] },
  ],
}
