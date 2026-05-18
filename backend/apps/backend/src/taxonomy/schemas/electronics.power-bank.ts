import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "electronics.power-bank", display_name: "Power bank", parent: "electronics",
  core_fields: [
    { key: "brand", label: "Brand", type: "string", required: false },
    { key: "capacity_mah", label: "Capacity (mAh)", type: "number", required: true, min: 1000, max: 100000 },
    { key: "ports", label: "Output ports", type: "string[]", required: false, options: ["usb-a", "usb-c", "lightning"] },
    { key: "color", label: "Color", type: "string", required: false },
  ],
}
