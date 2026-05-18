import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.pants", display_name: "Pants", parent: "fashion",
  core_fields: [
    { key: "waist_in", label: "Waist (in)", type: "number", required: true, min: 20, max: 50 },
    { key: "length_in", label: "Length (in)", type: "number", required: false, min: 24, max: 40 },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "gender", label: "Gender", type: "enum", required: false, options: ["mens", "womens", "unisex"] },
  ],
}
