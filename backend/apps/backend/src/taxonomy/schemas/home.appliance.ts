import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.appliance", display_name: "Appliance", parent: "home",
  core_fields: [
    { key: "brand", label: "Brand", type: "string", required: false },
    { key: "appliance_type", label: "Type", type: "enum", required: true, options: ["kettle", "toaster", "blender", "coffee-maker", "iron", "fan"] },
    { key: "capacity_l", label: "Capacity (L)", type: "number", required: false, min: 0.1, max: 20 },
    { key: "watts", label: "Power (W)", type: "number", required: false, min: 10, max: 5000 },
  ],
}
