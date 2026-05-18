import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.jacket", display_name: "Jacket", parent: "fashion",
  core_fields: [
    { key: "size", label: "Size", type: "enum", required: true, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "season", label: "Season", type: "enum", required: false, options: ["spring", "summer", "fall", "winter", "all"] },
    { key: "gender", label: "Gender", type: "enum", required: false, options: ["mens", "womens", "unisex"] },
  ],
}
