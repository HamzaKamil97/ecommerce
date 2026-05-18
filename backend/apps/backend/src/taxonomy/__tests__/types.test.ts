import { describe, it, expect } from "@jest/globals"
import type { LeafSchema, FieldDef, ValidationError, ValidateResult } from "../types"

describe("taxonomy types", () => {
  it("LeafSchema accepts a minimal valid shape", () => {
    const schema: LeafSchema = {
      handle: "food.pizza",
      display_name: "Pizza",
      parent: "food",
      core_fields: [
        { key: "size_in", label: "Size (in)", type: "enum", required: true, options: ["10", "12"] },
      ],
    }
    expect(schema.handle).toBe("food.pizza")
  })

  it("FieldDef supports all field types", () => {
    const fields: FieldDef[] = [
      { key: "a", label: "A", type: "string", required: false },
      { key: "b", label: "B", type: "number", required: true, min: 0 },
      { key: "c", label: "C", type: "boolean", required: false },
      { key: "d", label: "D", type: "enum", required: true, options: ["x", "y"] },
      { key: "e", label: "E", type: "string[]", required: false },
      { key: "f", label: "F", type: "string[]", required: false, options: ["one", "two"] },
    ]
    expect(fields.length).toBe(6)
  })

  it("ValidateResult discriminated union", () => {
    const ok: ValidateResult = { ok: true }
    const bad: ValidateResult = {
      ok: false,
      errors: [{ key: "size_in", reason: "required", message: "size_in is required" }],
    }
    if (!bad.ok) {
      expect(bad.errors[0].reason).toBe("required")
    }
  })
})
