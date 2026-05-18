import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "electronics.smartwatch", display_name: "Smartwatch", parent: "electronics",
  core_fields: [
    { key: "brand", label: "Brand", type: "string", required: true },
    { key: "case_size_mm", label: "Case size (mm)", type: "number", required: false, min: 30, max: 60 },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "band_material", label: "Band material", type: "string", required: false },
    { key: "battery_hours", label: "Battery (hours)", type: "number", required: false, min: 1, max: 720 },
  ],
}
