import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.dress", display_name: "Dress", parent: "fashion",
  core_fields: [
    { key: "size", label: "Size", type: "enum", required: true, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "length", label: "Length", type: "enum", required: false, options: ["mini", "midi", "maxi"] },
  ],
}
