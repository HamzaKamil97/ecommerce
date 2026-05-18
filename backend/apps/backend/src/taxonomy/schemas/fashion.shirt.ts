import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.shirt", display_name: "Shirt", parent: "fashion",
  core_fields: [
    { key: "size", label: "Size", type: "enum", required: true, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "fit", label: "Fit", type: "enum", required: false, options: ["slim", "regular", "loose"] },
    { key: "gender", label: "Gender", type: "enum", required: false, options: ["mens", "womens", "unisex"] },
  ],
}
