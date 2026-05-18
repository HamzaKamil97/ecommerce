import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.oil", display_name: "Oil", parent: "grocery",
  core_fields: [
    { key: "volume_ml", label: "Volume (ml)", type: "number", required: true, min: 100, max: 5000 },
    { key: "oil_type", label: "Type", type: "enum", required: true, options: ["olive", "sunflower", "vegetable", "corn", "canola"] },
  ],
}
