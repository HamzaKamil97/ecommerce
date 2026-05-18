import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.rice", display_name: "Rice & Grains", parent: "grocery",
  core_fields: [
    { key: "weight_kg", label: "Weight (kg)", type: "number", required: true, min: 0.1, max: 50 },
    { key: "rice_type", label: "Type", type: "enum", required: false, options: ["basmati", "long-grain", "short-grain", "brown", "jasmine"] },
    { key: "origin", label: "Origin", type: "string", required: false },
  ],
}
