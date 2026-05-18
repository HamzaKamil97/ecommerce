import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.accessory", display_name: "Accessory", parent: "fashion",
  core_fields: [
    { key: "accessory_type", label: "Type", type: "enum", required: true, options: ["belt", "hat", "scarf", "bag", "watch", "jewelry"] },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
  ],
}
