import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.cleaning", display_name: "Cleaning", parent: "home",
  core_fields: [
    { key: "cleaning_type", label: "Type", type: "enum", required: true, options: ["detergent", "disinfectant", "tool", "bundle"] },
    { key: "pieces", label: "Pieces", type: "number", required: false, min: 1, max: 20 },
    { key: "volume_ml", label: "Volume (ml)", type: "number", required: false, min: 50, max: 10000 },
  ],
}
