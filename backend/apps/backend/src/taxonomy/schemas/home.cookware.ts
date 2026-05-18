import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.cookware", display_name: "Cookware", parent: "home",
  core_fields: [
    { key: "material", label: "Material", type: "enum", required: true, options: ["stainless-steel", "non-stick", "cast-iron", "ceramic", "aluminum", "copper"] },
    { key: "pieces", label: "Pieces", type: "number", required: false, min: 1, max: 50 },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "induction_compatible", label: "Induction compatible", type: "boolean", required: false },
  ],
}
