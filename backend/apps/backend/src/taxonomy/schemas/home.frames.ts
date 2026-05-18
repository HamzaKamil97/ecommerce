import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.frames", display_name: "Frames", parent: "home",
  core_fields: [
    { key: "size_cm", label: "Size (cm)", type: "string", required: false, hint: "e.g. 20x30" },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "pieces", label: "Pieces (in set)", type: "number", required: false, min: 1, max: 20 },
  ],
}
