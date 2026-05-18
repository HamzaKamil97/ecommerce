import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "food.pizza", display_name: "Pizza", parent: "food",
  core_fields: [
    { key: "size_in", label: "Size (inches)", type: "enum", required: true, options: ["8", "10", "12", "14", "16"] },
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 120, hint: "For shop ETA — not shown on product" },
    { key: "toppings", label: "Toppings", type: "string[]", required: false },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "nuts", "soy"] },
    { key: "is_vegan", label: "Vegan", type: "boolean", required: false },
  ],
}
