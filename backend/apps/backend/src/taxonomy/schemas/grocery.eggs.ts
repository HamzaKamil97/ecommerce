import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.eggs", display_name: "Eggs", parent: "grocery",
  core_fields: [
    { key: "count", label: "Count", type: "number", required: true, min: 1, max: 60 },
    { key: "is_free_range", label: "Free-range", type: "boolean", required: false },
  ],
}
