import { describe, it, expect } from "@jest/globals"
import { validateCoreFields } from "../validate"
import type { LeafSchema } from "../types"

const PIZZA: LeafSchema = {
  handle: "food.pizza",
  display_name: "Pizza",
  parent: "food",
  core_fields: [
    { key: "size_in", label: "Size", type: "enum", required: true, options: ["10", "12", "14"] },
    { key: "prep_min", label: "Prep time", type: "number", required: true, min: 1, max: 120 },
    { key: "toppings", label: "Toppings", type: "string[]", required: false },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "nuts"] },
    { key: "is_vegan", label: "Vegan", type: "boolean", required: false },
  ],
}

describe("validateCoreFields", () => {
  it("passes a fully-populated valid input", () => {
    const r = validateCoreFields(PIZZA, {
      size_in: "12",
      prep_min: 18,
      toppings: ["basil", "tomato"],
      allergens: ["gluten", "dairy"],
      is_vegan: false,
    })
    expect(r.ok).toBe(true)
  })

  it("passes when only required fields are present", () => {
    const r = validateCoreFields(PIZZA, { size_in: "10", prep_min: 12 })
    expect(r.ok).toBe(true)
  })

  it("rejects when a required field is missing", () => {
    const r = validateCoreFields(PIZZA, { prep_min: 12 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors).toHaveLength(1)
      expect(r.errors[0]).toMatchObject({ key: "size_in", reason: "required" })
    }
  })

  it("rejects wrong type", () => {
    const r = validateCoreFields(PIZZA, { size_in: "12", prep_min: "not a number" as any })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0]).toMatchObject({ key: "prep_min", reason: "wrong_type" })
    }
  })

  it("rejects enum value outside options", () => {
    const r = validateCoreFields(PIZZA, { size_in: "20", prep_min: 12 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0]).toMatchObject({ key: "size_in", reason: "not_in_options" })
    }
  })

  it("rejects number out of range", () => {
    const r = validateCoreFields(PIZZA, { size_in: "10", prep_min: 999 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0]).toMatchObject({ key: "prep_min", reason: "out_of_range" })
    }
  })

  it("rejects string[] value with element outside options", () => {
    const r = validateCoreFields(PIZZA, {
      size_in: "10", prep_min: 12,
      allergens: ["gluten", "pineapple"],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0]).toMatchObject({ key: "allergens", reason: "not_in_options" })
    }
  })

  it("rejects unknown key", () => {
    const r = validateCoreFields(PIZZA, { size_in: "10", prep_min: 12, mystery: "?" } as any)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0]).toMatchObject({ key: "mystery", reason: "unknown_key" })
    }
  })

  it("aggregates multiple errors instead of stopping at first", () => {
    const r = validateCoreFields(PIZZA, { size_in: "99", prep_min: -5 } as any)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThanOrEqual(2)
    }
  })
})
