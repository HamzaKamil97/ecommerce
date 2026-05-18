import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.bedding", display_name: "Bedding", parent: "home",
  core_fields: [
    { key: "size", label: "Size", type: "enum", required: true, options: ["single", "double", "queen", "king"] },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "thread_count", label: "Thread count", type: "number", required: false, min: 50, max: 2000 },
  ],
}
