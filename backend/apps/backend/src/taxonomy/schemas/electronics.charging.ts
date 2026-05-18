import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "electronics.charging", display_name: "Charging", parent: "electronics",
  core_fields: [
    { key: "brand", label: "Brand", type: "string", required: false },
    { key: "connector", label: "Connector", type: "enum", required: true, options: ["usb-a", "usb-c", "lightning", "micro-usb", "magsafe"] },
    { key: "length_m", label: "Length (m)", type: "number", required: false, min: 0.1, max: 10 },
    { key: "watts", label: "Power (W)", type: "number", required: false, min: 1, max: 250 },
  ],
}
