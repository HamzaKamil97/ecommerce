import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "food.burger", display_name: "Burger", parent: "food",
  core_fields: [
    { key: "patty_type", label: "Patty", type: "enum", required: true, options: ["beef", "chicken", "lamb", "veggie"] },
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 60 },
    { key: "spice_level", label: "Spice level", type: "enum", required: false, options: ["none", "mild", "medium", "hot"] },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "soy"] },
  ],
}
