import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.decor", display_name: "Decor", parent: "home",
  core_fields: [
    { key: "decor_type", label: "Type", type: "enum", required: false, options: ["candle", "vase", "ornament", "art", "rug"] },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "burn_hours", label: "Burn time (h, candles)", type: "number", required: false, min: 0, max: 200 },
  ],
}
