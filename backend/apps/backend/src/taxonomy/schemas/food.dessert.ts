import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "food.dessert", display_name: "Dessert", parent: "food",
  core_fields: [
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 60 },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "nuts"] },
  ],
}
