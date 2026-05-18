import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.bath-textiles", display_name: "Bath textiles", parent: "home",
  core_fields: [
    { key: "material", label: "Material", type: "string", required: false },
    { key: "pieces", label: "Pieces", type: "number", required: false, min: 1, max: 20 },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "size", label: "Size", type: "enum", required: false, options: ["face", "hand", "bath", "beach"] },
  ],
}
