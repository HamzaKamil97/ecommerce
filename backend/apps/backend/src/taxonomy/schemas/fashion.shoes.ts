import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.shoes", display_name: "Shoes", parent: "fashion",
  core_fields: [
    { key: "size_eu", label: "Size (EU)", type: "number", required: true, min: 30, max: 50 },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "style", label: "Style", type: "enum", required: false, options: ["sneaker", "boot", "sandal", "formal", "loafer"] },
    { key: "gender", label: "Gender", type: "enum", required: false, options: ["mens", "womens", "unisex"] },
  ],
}
