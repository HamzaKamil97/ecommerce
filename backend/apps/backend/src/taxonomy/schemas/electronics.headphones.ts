import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "electronics.headphones", display_name: "Headphones", parent: "electronics",
  core_fields: [
    { key: "brand", label: "Brand", type: "string", required: true },
    { key: "wireless", label: "Wireless", type: "boolean", required: true },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "noise_cancelling", label: "Noise cancelling", type: "boolean", required: false },
    { key: "battery_hours", label: "Battery (hours)", type: "number", required: false, min: 0, max: 100 },
  ],
}
