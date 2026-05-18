import { describe, it, expect } from "@jest/globals"
import { getSchemaByHandle, listAllSchemas, listSectionLeaves } from "../registry"
import { TAXONOMY_TREE, listLeaves } from "../tree"

describe("schema registry", () => {
  it("has a schema for every leaf in the tree", () => {
    const leaves = listLeaves()
    const missing = leaves.filter((leaf) => getSchemaByHandle(leaf.handle) === null)
    expect(missing.map((n) => n.handle)).toEqual([])
  })

  it("has no schema for non-leaf (Section) handles", () => {
    for (const section of TAXONOMY_TREE) {
      expect(getSchemaByHandle(section.handle)).toBeNull()
    }
  })

  it("returns null for unknown handles", () => {
    expect(getSchemaByHandle("does.not.exist")).toBeNull()
  })

  it("all loaded schemas have unique handles", () => {
    const handles = listAllSchemas().map((s) => s.handle)
    expect(new Set(handles).size).toBe(handles.length)
  })

  it("every schema has no duplicate field keys", () => {
    for (const s of listAllSchemas()) {
      const keys = s.core_fields.map((f) => f.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it("every schema's parent matches the tree", () => {
    for (const s of listAllSchemas()) {
      const expectedParent = s.handle.split(".")[0]
      expect(s.parent).toBe(expectedParent)
    }
  })

  it("listSectionLeaves returns only leaves under that section", () => {
    const foodLeaves = listSectionLeaves("food")
    expect(foodLeaves.length).toBeGreaterThan(0)
    expect(foodLeaves.every((s) => s.handle.startsWith("food."))).toBe(true)
  })

  it("listSectionLeaves returns [] for unknown section", () => {
    expect(listSectionLeaves("nope")).toEqual([])
  })
})
