# SP-A: Catalog + Product-Category Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `vertical-fields` module with a 3-level platform-curated taxonomy (Section → Category → Sub-category) on Medusa's `product_category`, add a per-shop `merch_category` for browse buckets, and rebuild the customer + vendor surfaces around a unified schema-driven DetailsPanel.

**Architecture:** Taxonomy nodes live in Medusa's existing `product_category` table with dot-namespaced handles. Schemas attach at Category or Sub-category level as TypeScript modules under `src/taxonomy/schemas/`. Sub-category is opt-in advanced for vendors. Customer browse is shops-first; the taxonomy is internal (surfaces only in search filters). Cart access on customer screens is a small circular FAB (InstaShop pattern). The same `DetailsPanel`, `ProductCard`, `CartFab`, `MerchTabs`, and `FilterChips` components serve every section — only schema-driven content adapts.

**Tech Stack:** Medusa v2 (TypeScript framework), PostgreSQL 16, Jest + @medusajs/test-utils, React Native + Expo (mobile), Next.js 15 (storefront), Next.js 14 (vendor portal).

**Spec:** `docs/superpowers/specs/2026-05-18-sp-a-catalog-taxonomy-design.md` (commit `0e33263`).

**Estimated effort:** ~14 working days across 10 phases.

---

## File structure

### Backend (`backend/apps/backend/src/`)

```
taxonomy/                                  NEW
├── types.ts                              LeafSchema, FieldDef, ValidationError, ValidateResult
├── tree.ts                               Hierarchical Section→Category→Sub-category data
├── registry.ts                           Schema loader + lookup API
├── validate.ts                           validateCoreFields(handle, fields)
├── schemas/                              One file per Category or Sub-category leaf
│   ├── food.pizza.ts
│   ├── food.burger.ts
│   ├── ... (~30 files at v0)
└── __tests__/
    ├── registry.test.ts
    └── validate.test.ts

modules/merch/                            NEW MODULE
├── index.ts                              MERCH_MODULE registration
├── service.ts                            MerchService extends MedusaService
├── models/
│   ├── merch-category.ts
│   └── product-merch-category.ts
└── migrations/                           Auto-generated

workflows/                                NEW directory or additions
├── assign-product-to-taxonomy.ts
├── create-product-with-taxonomy.ts
└── sync-taxonomy-seed.ts

subscribers/
└── taxonomy-boot.ts                      NEW — runs syncTaxonomySeedWorkflow on app boot

api/store/
├── taxonomy/
│   ├── tree/route.ts                     NEW
│   └── leaves/[handle]/route.ts          NEW
└── tenants/[slug]/merch-categories/route.ts   NEW

api/admin/
├── tenants/[tenantId]/merch-categories/
│   ├── route.ts                          NEW — GET + POST
│   └── [id]/route.ts                     NEW — PATCH + DELETE
└── products/[productId]/
    ├── taxonomy/route.ts                 NEW — POST
    └── merch-categories/route.ts         NEW — PUT (full replacement)

scripts/
└── seed-demo-shops.ts                    REWRITTEN

modules/tenant/migrations/                ONE NEW migration
└── Migration<timestamp>.ts               Alter tenant.vertical CHECK constraint

modules/vertical-fields/                  DELETED ENTIRELY in Phase 10
```

### Mobile (`mobile/src/`)

```
components/
├── DetailsPanel.tsx                      NEW — schema-driven specs renderer
├── CartFab.tsx                           NEW — small circle FAB (bottom-right)
├── MerchTabs.tsx                         NEW — sticky horizontal tab strip
├── FilterChips.tsx                       NEW — search filter chips
├── ProductCard.tsx                       MODIFIED — strip prep time
└── PriceText.tsx                         unchanged (Phase 3 work)

app/shop/[slug].tsx                       MODIFIED — uses MerchTabs + CartFab
app/product/[id].tsx                      MODIFIED — uses DetailsPanel + top-right cart icon
app/search.tsx                            MODIFIED — uses FilterChips + CartFab

lib/api/taxonomy.ts                       NEW — fetch tree, leaf schemas
lib/api/merch.ts                          NEW — fetch shop merch categories
```

### Storefront (`backend/apps/storefront/src/`)

```
modules/products/components/
├── details-panel.tsx                     NEW — parallel of mobile DetailsPanel
├── cart-fab.tsx                          NEW
└── merch-tabs.tsx                        NEW

app/[countryCode]/(main)/
├── shop/[handle]/page.tsx                NEW (or MODIFIED if exists)
├── products/[handle]/page.tsx            MODIFIED — adds DetailsPanel
└── search/page.tsx                       NEW — search with filters
```

### Vendor portal (`backend/apps/vendor/`)

```
src/components/create-product/
├── CategoryPicker.tsx                    NEW — 2-level default + advanced toggle
├── SchemaForm.tsx                        NEW — renders fields from schema
├── CustomFieldsEditor.tsx                NEW — add/remove arbitrary key/value
└── MerchTagger.tsx                       NEW

src/app/products/new/page.tsx             NEW — wizard host
```

---

## Phase 1 — Taxonomy foundation (types, validation, registry)

### Task 1.1: Define taxonomy types

**Files:**
- Create: `backend/apps/backend/src/taxonomy/types.ts`
- Create: `backend/apps/backend/src/taxonomy/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/apps/backend/src/taxonomy/__tests__/types.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/backend && npx jest src/taxonomy/__tests__/types.test.ts`
Expected: FAIL with "Cannot find module '../types'".

- [ ] **Step 3: Implement the types**

Create `backend/apps/backend/src/taxonomy/types.ts`:

```typescript
export type FieldType = "string" | "number" | "boolean" | "enum" | "string[]"

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required: boolean
  /** For number type — minimum allowed value. */
  min?: number
  /** For number type — maximum allowed value. */
  max?: number
  /** For enum and string[] — allowed values. */
  options?: string[]
  /** Human-readable hint shown under the field in admin UI. */
  hint?: string
}

export interface LeafSchema {
  /** Dot-namespaced taxonomy handle, e.g. "food.pizza" or "fashion.mens.shirts". */
  handle: string
  display_name: string
  /** Parent handle. Null only for root sections (not used in v0 — schemas don't live on Sections). */
  parent: string
  core_fields: FieldDef[]
}

export type ValidationReason =
  | "required"          // required field missing
  | "wrong_type"        // value is wrong JS type for the FieldDef
  | "not_in_options"    // enum/string[] value outside options
  | "unknown_key"       // core_fields contains a key not in the schema
  | "out_of_range"      // number outside min/max
  | "collision"         // custom_fields key collides with core_fields key

export interface ValidationError {
  key: string
  reason: ValidationReason
  message: string
}

export type ValidateResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend/apps/backend && npx jest src/taxonomy/__tests__/types.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/taxonomy/types.ts \
        backend/apps/backend/src/taxonomy/__tests__/types.test.ts
git commit -m "feat(taxonomy): define LeafSchema/FieldDef/ValidationError types

Foundation for the new platform-curated taxonomy. Field types supported:
string, number, boolean, enum, string[]. ValidateResult is a discriminated
union so callers must check .ok before accessing .errors.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.2: validateCoreFields function

**Files:**
- Create: `backend/apps/backend/src/taxonomy/validate.ts`
- Create: `backend/apps/backend/src/taxonomy/__tests__/validate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `backend/apps/backend/src/taxonomy/__tests__/validate.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/apps/backend && npx jest src/taxonomy/__tests__/validate.test.ts`
Expected: FAIL — "Cannot find module '../validate'".

- [ ] **Step 3: Implement validate.ts**

Create `backend/apps/backend/src/taxonomy/validate.ts`:

```typescript
import type { LeafSchema, FieldDef, ValidationError, ValidateResult } from "./types"

function checkType(field: FieldDef, value: unknown): ValidationError | null {
  switch (field.type) {
    case "string":
      return typeof value === "string" ? null : err(field.key, "wrong_type", `expected string`)
    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) {
        return err(field.key, "wrong_type", `expected number`)
      }
      if (field.min !== undefined && value < field.min) {
        return err(field.key, "out_of_range", `${field.key} < ${field.min}`)
      }
      if (field.max !== undefined && value > field.max) {
        return err(field.key, "out_of_range", `${field.key} > ${field.max}`)
      }
      return null
    case "boolean":
      return typeof value === "boolean" ? null : err(field.key, "wrong_type", `expected boolean`)
    case "enum":
      if (typeof value !== "string") return err(field.key, "wrong_type", `expected string`)
      if (!field.options?.includes(value)) {
        return err(field.key, "not_in_options", `"${value}" not in [${field.options?.join(", ")}]`)
      }
      return null
    case "string[]":
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
        return err(field.key, "wrong_type", `expected string[]`)
      }
      if (field.options) {
        const bad = value.find((v) => !field.options!.includes(v))
        if (bad !== undefined) {
          return err(field.key, "not_in_options", `"${bad}" not in [${field.options.join(", ")}]`)
        }
      }
      return null
  }
}

function err(key: string, reason: ValidationError["reason"], message: string): ValidationError {
  return { key, reason, message }
}

export function validateCoreFields(
  schema: LeafSchema,
  values: Record<string, unknown>
): ValidateResult {
  const errors: ValidationError[] = []
  const declaredKeys = new Set(schema.core_fields.map((f) => f.key))

  // 1. Unknown keys
  for (const key of Object.keys(values)) {
    if (!declaredKeys.has(key)) {
      errors.push(err(key, "unknown_key", `"${key}" is not in schema ${schema.handle}`))
    }
  }

  // 2. For each declared field: required check + type check
  for (const field of schema.core_fields) {
    const value = values[field.key]
    const isMissing = value === undefined || value === null
    if (field.required && isMissing) {
      errors.push(err(field.key, "required", `${field.key} is required`))
      continue
    }
    if (isMissing) continue
    const typeErr = checkType(field, value)
    if (typeErr) errors.push(typeErr)
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/apps/backend && npx jest src/taxonomy/__tests__/validate.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/taxonomy/validate.ts \
        backend/apps/backend/src/taxonomy/__tests__/validate.test.ts
git commit -m "feat(taxonomy): validateCoreFields with per-type rules

Validates required, type, range, enum-options, string[]-options, and
unknown-key rules. Aggregates all errors (does not short-circuit).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.3: Taxonomy tree definition + sample schemas

**Files:**
- Create: `backend/apps/backend/src/taxonomy/tree.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/food.pizza.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/food.burger.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/food.salad.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/food.pasta.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/food.dessert.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/food.drink.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/grocery.rice.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/grocery.dairy.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/grocery.eggs.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/grocery.fruit.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/grocery.vegetable.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/grocery.oil.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/grocery.bakery.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/grocery.snack.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/fashion.shirt.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/fashion.pants.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/fashion.jacket.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/fashion.dress.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/fashion.shoes.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/fashion.accessory.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/electronics.headphones.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/electronics.earbuds.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/electronics.charging.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/electronics.smartwatch.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/electronics.power-bank.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/home.cookware.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/home.bath-textiles.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/home.bedding.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/home.cleaning.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/home.decor.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/home.appliance.ts`
- Create: `backend/apps/backend/src/taxonomy/schemas/home.frames.ts`

- [ ] **Step 1: Write the tree definition**

Create `backend/apps/backend/src/taxonomy/tree.ts`:

```typescript
/**
 * Hanoot taxonomy tree — Section → Category (→ Sub-category).
 *
 * Handles are dot-namespaced. Sections do NOT have schemas (they're
 * navigational only). Categories carry the default schema. Sub-categories,
 * when present, override/extend the Category schema.
 *
 * Adding a new node: add it here AND create the matching schemas/<handle>.ts
 * file. The boot-time integrity test (registry.test.ts) catches mismatches.
 *
 * Vendors cannot edit this tree — platform team only.
 */

export interface TreeNode {
  handle: string
  display_name: string
  /** Children. Empty array means this node is a leaf (Category with no sub-categories). */
  children: TreeNode[]
}

export const TAXONOMY_TREE: TreeNode[] = [
  {
    handle: "food", display_name: "Food",
    children: [
      { handle: "food.pizza",   display_name: "Pizza",   children: [] },
      { handle: "food.burger",  display_name: "Burger",  children: [] },
      { handle: "food.salad",   display_name: "Salad",   children: [] },
      { handle: "food.pasta",   display_name: "Pasta",   children: [] },
      { handle: "food.dessert", display_name: "Dessert", children: [] },
      { handle: "food.drink",   display_name: "Drink",   children: [] },
    ],
  },
  {
    handle: "grocery", display_name: "Grocery",
    children: [
      { handle: "grocery.rice",      display_name: "Rice & Grains", children: [] },
      { handle: "grocery.dairy",     display_name: "Dairy",         children: [] },
      { handle: "grocery.eggs",      display_name: "Eggs",          children: [] },
      { handle: "grocery.fruit",     display_name: "Fruit",         children: [] },
      { handle: "grocery.vegetable", display_name: "Vegetable",     children: [] },
      { handle: "grocery.oil",       display_name: "Oil",           children: [] },
      { handle: "grocery.bakery",    display_name: "Bakery",        children: [] },
      { handle: "grocery.snack",     display_name: "Snack",         children: [] },
    ],
  },
  {
    handle: "fashion", display_name: "Fashion",
    children: [
      { handle: "fashion.shirt",     display_name: "Shirt",     children: [] },
      { handle: "fashion.pants",     display_name: "Pants",     children: [] },
      { handle: "fashion.jacket",    display_name: "Jacket",    children: [] },
      { handle: "fashion.dress",     display_name: "Dress",     children: [] },
      { handle: "fashion.shoes",     display_name: "Shoes",     children: [] },
      { handle: "fashion.accessory", display_name: "Accessory", children: [] },
    ],
  },
  {
    handle: "electronics", display_name: "Electronics",
    children: [
      { handle: "electronics.headphones", display_name: "Headphones", children: [] },
      { handle: "electronics.earbuds",    display_name: "Earbuds",    children: [] },
      { handle: "electronics.charging",   display_name: "Charging",   children: [] },
      { handle: "electronics.smartwatch", display_name: "Smartwatch", children: [] },
      { handle: "electronics.power-bank", display_name: "Power bank", children: [] },
    ],
  },
  {
    handle: "home", display_name: "Home & Household",
    children: [
      { handle: "home.cookware",       display_name: "Cookware",       children: [] },
      { handle: "home.bath-textiles",  display_name: "Bath textiles",  children: [] },
      { handle: "home.bedding",        display_name: "Bedding",        children: [] },
      { handle: "home.cleaning",       display_name: "Cleaning",       children: [] },
      { handle: "home.decor",          display_name: "Decor",          children: [] },
      { handle: "home.appliance",      display_name: "Appliance",      children: [] },
      { handle: "home.frames",         display_name: "Frames",         children: [] },
    ],
  },
]

/**
 * Flatten the tree into a list of all nodes (Section + Category + Sub-category).
 * Order: depth-first, pre-order.
 */
export function flattenTree(): TreeNode[] {
  const out: TreeNode[] = []
  function walk(nodes: TreeNode[]) {
    for (const n of nodes) {
      out.push(n)
      if (n.children.length > 0) walk(n.children)
    }
  }
  walk(TAXONOMY_TREE)
  return out
}

/**
 * Return all leaf nodes (no children). These are the nodes that can have a schema
 * and that a vendor can pick as the terminal taxonomy node for a product.
 *
 * In v0 most leaves are at Category level (Sub-category support reserved for
 * future expansion; vendor wizard toggles it on/off).
 */
export function listLeaves(): TreeNode[] {
  return flattenTree().filter((n) => n.children.length === 0 && n.handle.includes("."))
}

/**
 * Find a node by exact handle. Returns null if not found.
 */
export function findNode(handle: string): TreeNode | null {
  return flattenTree().find((n) => n.handle === handle) ?? null
}
```

- [ ] **Step 2: Create schemas/food.pizza.ts**

```typescript
import type { LeafSchema } from "../types"

export const schema: LeafSchema = {
  handle: "food.pizza",
  display_name: "Pizza",
  parent: "food",
  core_fields: [
    { key: "size_in", label: "Size (inches)", type: "enum", required: true, options: ["8", "10", "12", "14", "16"] },
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 120, hint: "For shop ETA — not shown on product" },
    { key: "toppings", label: "Toppings", type: "string[]", required: false },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "nuts", "soy"] },
    { key: "is_vegan", label: "Vegan", type: "boolean", required: false },
  ],
}
```

- [ ] **Step 3: Create schemas/food.burger.ts**

```typescript
import type { LeafSchema } from "../types"

export const schema: LeafSchema = {
  handle: "food.burger",
  display_name: "Burger",
  parent: "food",
  core_fields: [
    { key: "patty_type", label: "Patty", type: "enum", required: true, options: ["beef", "chicken", "lamb", "veggie"] },
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 60 },
    { key: "spice_level", label: "Spice level", type: "enum", required: false, options: ["none", "mild", "medium", "hot"] },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "soy"] },
  ],
}
```

- [ ] **Step 4: Create schemas/food.salad.ts**

```typescript
import type { LeafSchema } from "../types"

export const schema: LeafSchema = {
  handle: "food.salad",
  display_name: "Salad",
  parent: "food",
  core_fields: [
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 60 },
    { key: "dressing", label: "Dressing", type: "string", required: false },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "nuts", "fish"] },
  ],
}
```

- [ ] **Step 5: Create schemas/food.pasta.ts**

```typescript
import type { LeafSchema } from "../types"

export const schema: LeafSchema = {
  handle: "food.pasta",
  display_name: "Pasta",
  parent: "food",
  core_fields: [
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 90 },
    { key: "sauce", label: "Sauce", type: "string", required: false },
    { key: "spice_level", label: "Spice level", type: "enum", required: false, options: ["none", "mild", "medium", "hot"] },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg"] },
  ],
}
```

- [ ] **Step 6: Create schemas/food.dessert.ts**

```typescript
import type { LeafSchema } from "../types"

export const schema: LeafSchema = {
  handle: "food.dessert",
  display_name: "Dessert",
  parent: "food",
  core_fields: [
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 60 },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "nuts"] },
  ],
}
```

- [ ] **Step 7: Create schemas/food.drink.ts**

```typescript
import type { LeafSchema } from "../types"

export const schema: LeafSchema = {
  handle: "food.drink",
  display_name: "Drink",
  parent: "food",
  core_fields: [
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, min: 1, max: 30 },
    { key: "volume_ml", label: "Volume (ml)", type: "number", required: false, min: 50, max: 2000 },
    { key: "is_hot", label: "Hot drink", type: "boolean", required: false },
  ],
}
```

- [ ] **Step 8: Create grocery schemas (8 files)**

Create the following 8 files, each with the structure shown:

`schemas/grocery.rice.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.rice", display_name: "Rice & Grains", parent: "grocery",
  core_fields: [
    { key: "weight_kg", label: "Weight (kg)", type: "number", required: true, min: 0.1, max: 50 },
    { key: "rice_type", label: "Type", type: "enum", required: false, options: ["basmati", "long-grain", "short-grain", "brown", "jasmine"] },
    { key: "origin", label: "Origin", type: "string", required: false },
  ],
}
```

`schemas/grocery.dairy.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.dairy", display_name: "Dairy", parent: "grocery",
  core_fields: [
    { key: "volume_ml", label: "Volume (ml)", type: "number", required: false, min: 50 },
    { key: "weight_g", label: "Weight (g)", type: "number", required: false, min: 50 },
    { key: "fat_percent", label: "Fat %", type: "number", required: false, min: 0, max: 100 },
    { key: "dairy_type", label: "Type", type: "enum", required: true, options: ["milk", "yogurt", "cheese", "butter", "cream"] },
  ],
}
```

`schemas/grocery.eggs.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.eggs", display_name: "Eggs", parent: "grocery",
  core_fields: [
    { key: "count", label: "Count", type: "number", required: true, min: 1, max: 60 },
    { key: "is_free_range", label: "Free-range", type: "boolean", required: false },
  ],
}
```

`schemas/grocery.fruit.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.fruit", display_name: "Fruit", parent: "grocery",
  core_fields: [
    { key: "weight_kg", label: "Weight (kg)", type: "number", required: true, min: 0.05, max: 20 },
    { key: "origin", label: "Origin", type: "string", required: false },
    { key: "is_organic", label: "Organic", type: "boolean", required: false },
  ],
}
```

`schemas/grocery.vegetable.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.vegetable", display_name: "Vegetable", parent: "grocery",
  core_fields: [
    { key: "weight_kg", label: "Weight (kg)", type: "number", required: true, min: 0.05, max: 20 },
    { key: "origin", label: "Origin", type: "string", required: false },
    { key: "is_organic", label: "Organic", type: "boolean", required: false },
  ],
}
```

`schemas/grocery.oil.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.oil", display_name: "Oil", parent: "grocery",
  core_fields: [
    { key: "volume_ml", label: "Volume (ml)", type: "number", required: true, min: 100, max: 5000 },
    { key: "oil_type", label: "Type", type: "enum", required: true, options: ["olive", "sunflower", "vegetable", "corn", "canola"] },
  ],
}
```

`schemas/grocery.bakery.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.bakery", display_name: "Bakery", parent: "grocery",
  core_fields: [
    { key: "weight_g", label: "Weight (g)", type: "number", required: true, min: 50, max: 5000 },
    { key: "bakery_type", label: "Type", type: "enum", required: false, options: ["bread", "pastry", "cake", "biscuit"] },
    { key: "allergens", label: "Allergens", type: "string[]", required: false, options: ["gluten", "dairy", "egg", "nuts"] },
  ],
}
```

`schemas/grocery.snack.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "grocery.snack", display_name: "Snack", parent: "grocery",
  core_fields: [
    { key: "weight_g", label: "Weight (g)", type: "number", required: true, min: 10, max: 2000 },
    { key: "snack_type", label: "Type", type: "enum", required: false, options: ["chips", "nuts", "sweets", "biscuit"] },
    { key: "flavor", label: "Flavor", type: "string", required: false },
  ],
}
```

- [ ] **Step 9: Create fashion schemas (6 files)**

`schemas/fashion.shirt.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.shirt", display_name: "Shirt", parent: "fashion",
  core_fields: [
    { key: "size", label: "Size", type: "enum", required: true, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "fit", label: "Fit", type: "enum", required: false, options: ["slim", "regular", "loose"] },
    { key: "gender", label: "Gender", type: "enum", required: false, options: ["mens", "womens", "unisex"] },
  ],
}
```

`schemas/fashion.pants.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.pants", display_name: "Pants", parent: "fashion",
  core_fields: [
    { key: "waist_in", label: "Waist (in)", type: "number", required: true, min: 20, max: 50 },
    { key: "length_in", label: "Length (in)", type: "number", required: false, min: 24, max: 40 },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "gender", label: "Gender", type: "enum", required: false, options: ["mens", "womens", "unisex"] },
  ],
}
```

`schemas/fashion.jacket.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.jacket", display_name: "Jacket", parent: "fashion",
  core_fields: [
    { key: "size", label: "Size", type: "enum", required: true, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "season", label: "Season", type: "enum", required: false, options: ["spring", "summer", "fall", "winter", "all"] },
    { key: "gender", label: "Gender", type: "enum", required: false, options: ["mens", "womens", "unisex"] },
  ],
}
```

`schemas/fashion.dress.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.dress", display_name: "Dress", parent: "fashion",
  core_fields: [
    { key: "size", label: "Size", type: "enum", required: true, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "length", label: "Length", type: "enum", required: false, options: ["mini", "midi", "maxi"] },
  ],
}
```

`schemas/fashion.shoes.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.shoes", display_name: "Shoes", parent: "fashion",
  core_fields: [
    { key: "size_eu", label: "Size (EU)", type: "number", required: true, min: 30, max: 50 },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "style", label: "Style", type: "enum", required: false, options: ["sneaker", "boot", "sandal", "formal", "loafer"] },
    { key: "gender", label: "Gender", type: "enum", required: false, options: ["mens", "womens", "unisex"] },
  ],
}
```

`schemas/fashion.accessory.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "fashion.accessory", display_name: "Accessory", parent: "fashion",
  core_fields: [
    { key: "accessory_type", label: "Type", type: "enum", required: true, options: ["belt", "hat", "scarf", "bag", "watch", "jewelry"] },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
  ],
}
```

- [ ] **Step 10: Create electronics schemas (5 files)**

`schemas/electronics.headphones.ts`:
```typescript
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
```

`schemas/electronics.earbuds.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "electronics.earbuds", display_name: "Earbuds", parent: "electronics",
  core_fields: [
    { key: "brand", label: "Brand", type: "string", required: true },
    { key: "wireless", label: "Wireless", type: "boolean", required: true },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "battery_hours", label: "Battery (hours)", type: "number", required: false, min: 0, max: 50 },
  ],
}
```

`schemas/electronics.charging.ts`:
```typescript
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
```

`schemas/electronics.smartwatch.ts`:
```typescript
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
```

`schemas/electronics.power-bank.ts`:
```typescript
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
```

- [ ] **Step 11: Create home schemas (7 files)**

`schemas/home.cookware.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.cookware", display_name: "Cookware", parent: "home",
  core_fields: [
    { key: "material", label: "Material", type: "enum", required: true, options: ["stainless-steel", "non-stick", "cast-iron", "ceramic", "aluminum", "copper"] },
    { key: "pieces", label: "Pieces", type: "number", required: false, min: 1, max: 50 },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "induction_compatible", label: "Induction compatible", type: "boolean", required: false },
  ],
}
```

`schemas/home.bath-textiles.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.bath-textiles", display_name: "Bath textiles", parent: "home",
  core_fields: [
    { key: "material", label: "Material", type: "string", required: false },
    { key: "pieces", label: "Pieces", type: "number", required: false, min: 1, max: 20 },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "size", label: "Size", type: "enum", required: false, options: ["face", "hand", "bath", "beach"] },
  ],
}
```

`schemas/home.bedding.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.bedding", display_name: "Bedding", parent: "home",
  core_fields: [
    { key: "size", label: "Size", type: "enum", required: true, options: ["single", "double", "queen", "king"] },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "thread_count", label: "Thread count", type: "number", required: false, min: 50, max: 2000 },
  ],
}
```

`schemas/home.cleaning.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.cleaning", display_name: "Cleaning", parent: "home",
  core_fields: [
    { key: "cleaning_type", label: "Type", type: "enum", required: true, options: ["detergent", "disinfectant", "tool", "bundle"] },
    { key: "pieces", label: "Pieces", type: "number", required: false, min: 1, max: 20 },
    { key: "volume_ml", label: "Volume (ml)", type: "number", required: false, min: 50, max: 10000 },
  ],
}
```

`schemas/home.decor.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.decor", display_name: "Decor", parent: "home",
  core_fields: [
    { key: "decor_type", label: "Type", type: "enum", required: false, options: ["candle", "vase", "ornament", "art", "rug"] },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "burn_hours", label: "Burn time (h, candles)", type: "number", required: false, min: 0, max: 200 },
  ],
}
```

`schemas/home.appliance.ts`:
```typescript
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
```

`schemas/home.frames.ts`:
```typescript
import type { LeafSchema } from "../types"
export const schema: LeafSchema = {
  handle: "home.frames", display_name: "Frames", parent: "home",
  core_fields: [
    { key: "size_cm", label: "Size (cm)", type: "string", required: false, hint: "e.g. 20x30" },
    { key: "material", label: "Material", type: "string", required: false },
    { key: "color", label: "Color", type: "string", required: false },
    { key: "pieces", label: "Pieces (in set)", type: "number", required: false, min: 1, max: 20 },
  ],
}
```

- [ ] **Step 12: Commit all schema files + tree**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/taxonomy/tree.ts \
        backend/apps/backend/src/taxonomy/schemas/
git commit -m "feat(taxonomy): define tree + 32 leaf schemas

5 sections × ~6 categories each = ~32 leaves covering the 5 demo
verticals: food, grocery, fashion, electronics, home. Each schema lives
in its own file under src/taxonomy/schemas/<handle>.ts. Sub-category
expansion deferred — tree has Category-level leaves only at v0.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.4: Schema registry with integrity tests

**Files:**
- Create: `backend/apps/backend/src/taxonomy/registry.ts`
- Create: `backend/apps/backend/src/taxonomy/__tests__/registry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `backend/apps/backend/src/taxonomy/__tests__/registry.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/apps/backend && npx jest src/taxonomy/__tests__/registry.test.ts`
Expected: FAIL — "Cannot find module '../registry'".

- [ ] **Step 3: Implement registry.ts**

Create `backend/apps/backend/src/taxonomy/registry.ts` with explicit imports for all 32 schemas (one import line per file), assembled into an `ALL_SCHEMAS` array, indexed by handle in a `Map`. Implementation pattern:

```typescript
import type { LeafSchema } from "./types"
import { schema as foodPizza } from "./schemas/food.pizza"
import { schema as foodBurger } from "./schemas/food.burger"
import { schema as foodSalad } from "./schemas/food.salad"
import { schema as foodPasta } from "./schemas/food.pasta"
import { schema as foodDessert } from "./schemas/food.dessert"
import { schema as foodDrink } from "./schemas/food.drink"
import { schema as groceryRice } from "./schemas/grocery.rice"
import { schema as groceryDairy } from "./schemas/grocery.dairy"
import { schema as groceryEggs } from "./schemas/grocery.eggs"
import { schema as groceryFruit } from "./schemas/grocery.fruit"
import { schema as groceryVegetable } from "./schemas/grocery.vegetable"
import { schema as groceryOil } from "./schemas/grocery.oil"
import { schema as groceryBakery } from "./schemas/grocery.bakery"
import { schema as grocerySnack } from "./schemas/grocery.snack"
import { schema as fashionShirt } from "./schemas/fashion.shirt"
import { schema as fashionPants } from "./schemas/fashion.pants"
import { schema as fashionJacket } from "./schemas/fashion.jacket"
import { schema as fashionDress } from "./schemas/fashion.dress"
import { schema as fashionShoes } from "./schemas/fashion.shoes"
import { schema as fashionAccessory } from "./schemas/fashion.accessory"
import { schema as electronicsHeadphones } from "./schemas/electronics.headphones"
import { schema as electronicsEarbuds } from "./schemas/electronics.earbuds"
import { schema as electronicsCharging } from "./schemas/electronics.charging"
import { schema as electronicsSmartwatch } from "./schemas/electronics.smartwatch"
import { schema as electronicsPowerBank } from "./schemas/electronics.power-bank"
import { schema as homeCookware } from "./schemas/home.cookware"
import { schema as homeBathTextiles } from "./schemas/home.bath-textiles"
import { schema as homeBedding } from "./schemas/home.bedding"
import { schema as homeCleaning } from "./schemas/home.cleaning"
import { schema as homeDecor } from "./schemas/home.decor"
import { schema as homeAppliance } from "./schemas/home.appliance"
import { schema as homeFrames } from "./schemas/home.frames"

const ALL_SCHEMAS: LeafSchema[] = [
  foodPizza, foodBurger, foodSalad, foodPasta, foodDessert, foodDrink,
  groceryRice, groceryDairy, groceryEggs, groceryFruit, groceryVegetable, groceryOil, groceryBakery, grocerySnack,
  fashionShirt, fashionPants, fashionJacket, fashionDress, fashionShoes, fashionAccessory,
  electronicsHeadphones, electronicsEarbuds, electronicsCharging, electronicsSmartwatch, electronicsPowerBank,
  homeCookware, homeBathTextiles, homeBedding, homeCleaning, homeDecor, homeAppliance, homeFrames,
]

const BY_HANDLE = new Map<string, LeafSchema>(ALL_SCHEMAS.map((s) => [s.handle, s]))

export function getSchemaByHandle(handle: string): LeafSchema | null {
  return BY_HANDLE.get(handle) ?? null
}

export function listAllSchemas(): LeafSchema[] {
  return [...ALL_SCHEMAS]
}

export function listSectionLeaves(sectionHandle: string): LeafSchema[] {
  return ALL_SCHEMAS.filter((s) => s.handle.startsWith(`${sectionHandle}.`))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/apps/backend && npx jest src/taxonomy/__tests__/registry.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/taxonomy/registry.ts \
        backend/apps/backend/src/taxonomy/__tests__/registry.test.ts
git commit -m "feat(taxonomy): schema registry with integrity tests

Eager-imports all 32 leaf schemas and exposes lookup + iteration APIs.
Integrity tests assert: every tree leaf has a schema, no duplicate
handles, no duplicate field keys per schema, parent chain consistent.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

## Phase 2 — Merch module (per-shop browse buckets)

### Task 2.1: merch_category model + service + migration

**Files:**
- Create: `backend/apps/backend/src/modules/merch/index.ts`
- Create: `backend/apps/backend/src/modules/merch/service.ts`
- Create: `backend/apps/backend/src/modules/merch/models/merch-category.ts`
- Modify: `backend/apps/backend/medusa-config.ts`

- [ ] **Step 1: Create the model**

Create `backend/apps/backend/src/modules/merch/models/merch-category.ts`:

```typescript
import { model } from "@medusajs/framework/utils"

// A MerchCategory is a per-shop browse bucket (e.g., "Pizzas", "Burgers"
// inside Hamza's Kitchen). Decoupled from the global taxonomy. Flat per shop
// in v0 — no nesting. Soft-deletable.
export const MerchCategory = model.define("merch_category", {
  id: model.id().primaryKey(),
  tenant_id: model.text(),
  handle: model.text(),
  name: model.text(),
  position: model.number().default(0),
  icon_url: model.text().nullable(),
}).indexes([
  { on: ["tenant_id", "handle"], unique: true },
  { on: ["tenant_id"] },
])
```

- [ ] **Step 2: Create the module index**

Create `backend/apps/backend/src/modules/merch/index.ts`:

```typescript
import { Module } from "@medusajs/framework/utils"
import MerchService from "./service"

export const MERCH_MODULE = "merch"

export default Module(MERCH_MODULE, {
  service: MerchService,
})
```

- [ ] **Step 3: Create the service**

Create `backend/apps/backend/src/modules/merch/service.ts`:

```typescript
import { MedusaService } from "@medusajs/framework/utils"
import { MerchCategory } from "./models/merch-category"

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

class MerchService extends MedusaService({
  MerchCategory,
}) {
  async listForTenant(tenantId: string) {
    return this.listMerchCategories(
      { tenant_id: tenantId },
      { order: { position: "ASC", created_at: "ASC" } }
    )
  }

  async getByHandleForTenant(tenantId: string, handle: string) {
    const [row] = await this.listMerchCategories({ tenant_id: tenantId, handle })
    return row ?? null
  }

  async createForTenant(tenantId: string, data: { name: string; handle?: string; position?: number; icon_url?: string | null }) {
    const handle = data.handle ?? slugify(data.name)
    const existing = await this.getByHandleForTenant(tenantId, handle)
    if (existing) {
      throw new Error(`merch_category handle "${handle}" already exists for tenant ${tenantId}`)
    }
    return this.createMerchCategories({
      tenant_id: tenantId,
      handle,
      name: data.name,
      position: data.position ?? 0,
      icon_url: data.icon_url ?? null,
    })
  }
}

export default MerchService
```

- [ ] **Step 4: Register the module in medusa-config**

Modify `backend/apps/backend/medusa-config.ts`. Find the line containing `{ resolve: "./src/modules/tenant" }` and add immediately after it:

```typescript
    { resolve: "./src/modules/merch" },
```

- [ ] **Step 5: Generate and apply the migration**

```bash
cd backend/apps/backend
npx medusa db:generate merch
npx medusa db:migrate
```
Expected: migration file created in `src/modules/merch/migrations/`, and "Migration scripts completed".

- [ ] **Step 6: Verify the table**

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db -c "\d merch_category"
```
Expected: columns `id`, `tenant_id`, `handle`, `name`, `position`, `icon_url`, `created_at`, `updated_at`, `deleted_at`. Unique index on `(tenant_id, handle)`.

- [ ] **Step 7: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/modules/merch/ \
        backend/apps/backend/medusa-config.ts
git commit -m "feat(merch): add merch_category model + service

Per-shop browse buckets. tenant_id-scoped, unique handle per tenant.
Service: listForTenant (ordered), getByHandleForTenant, createForTenant
(auto-slugify, reject duplicates).

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 2.2: product → merch_category link

**Files:**
- Create: `backend/apps/backend/src/links/product-merch-category.ts`

- [ ] **Step 1: Create the link**

Create `backend/apps/backend/src/links/product-merch-category.ts`:

```typescript
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import MerchModule from "../modules/merch"

export default defineLink(
  ProductModule.linkable.product,
  {
    linkable: MerchModule.linkable.merchCategory,
    isList: true,
  }
)
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd backend/apps/backend
npx medusa db:generate merch
npx medusa db:migrate
```
Expected: new migration in `src/modules/merch/migrations/` for the link table. "Migration scripts completed".

- [ ] **Step 3: Verify the link table exists**

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db -c "\dt" | grep -i merch
```
Expected: two tables, `merch_category` plus a link table named like `product_merch_category_product_merch_category` (Medusa naming).

- [ ] **Step 4: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/links/ \
        backend/apps/backend/src/modules/merch/migrations/
git commit -m "feat(merch): link product → merch_category (one-to-many list)

defineLink with isList=true. A product can be in multiple merch buckets
within its tenant. Generated migration auto-creates the link table.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 2.3: MerchService integration tests

**Files:**
- Create: `backend/apps/backend/integration-tests/http/merch.spec.ts`

- [ ] **Step 1: Write the integration tests**

Create `backend/apps/backend/integration-tests/http/merch.spec.ts`:

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MERCH_MODULE } from "../../src/modules/merch"

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("MerchService", () => {
      it("creates and lists a merch category", async () => {
        const merch = getContainer().resolve(MERCH_MODULE) as any
        const cat = await merch.createForTenant("tnt_test_1", { name: "Pizzas" })
        expect(cat.handle).toBe("pizzas")
        expect(cat.tenant_id).toBe("tnt_test_1")
        const list = await merch.listForTenant("tnt_test_1")
        expect(list).toHaveLength(1)
        expect(list[0].name).toBe("Pizzas")
      })

      it("rejects duplicate handle for the same tenant", async () => {
        const merch = getContainer().resolve(MERCH_MODULE) as any
        await merch.createForTenant("tnt_test_2", { name: "Burgers" })
        await expect(merch.createForTenant("tnt_test_2", { name: "Burgers" }))
          .rejects.toThrow(/already exists/)
      })

      it("allows same handle across different tenants", async () => {
        const merch = getContainer().resolve(MERCH_MODULE) as any
        await merch.createForTenant("tnt_test_3a", { name: "Snacks" })
        await merch.createForTenant("tnt_test_3b", { name: "Snacks" })
        const a = await merch.listForTenant("tnt_test_3a")
        const b = await merch.listForTenant("tnt_test_3b")
        expect(a).toHaveLength(1)
        expect(b).toHaveLength(1)
      })

      it("orders by position then created_at", async () => {
        const merch = getContainer().resolve(MERCH_MODULE) as any
        await merch.createForTenant("tnt_test_4", { name: "Second", position: 2 })
        await merch.createForTenant("tnt_test_4", { name: "First",  position: 1 })
        const list = await merch.listForTenant("tnt_test_4")
        expect(list.map((c: any) => c.name)).toEqual(["First", "Second"])
      })
    })
  },
})
```

- [ ] **Step 2: Run tests**

Run: `cd backend/apps/backend && npm run test:integration:modules -- merch.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/integration-tests/http/merch.spec.ts
git commit -m "test(merch): integration tests for MerchService

Happy path, duplicate-handle rejection, tenant isolation, ordering.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

## Phase 3 — Tenant enum migration

### Task 3.1: Update tenant.vertical CHECK constraint

**Files:**
- Modify: `backend/apps/backend/src/modules/tenant/models/tenant.ts`

- [ ] **Step 1: Edit the Tenant model enum**

In `backend/apps/backend/src/modules/tenant/models/tenant.ts`, replace the `vertical` enum line:

OLD:
```typescript
  vertical: model.enum([
    "food",
    "flowers",
    "vegetables",
    "electronics",
    "fashion",
    "general",
  ]).default("general"),
```

NEW:
```typescript
  vertical: model.enum([
    "food",
    "grocery",
    "home",
    "fashion",
    "electronics",
    "general",
  ]).default("general"),
```

- [ ] **Step 2: Generate the migration**

```bash
cd backend/apps/backend
npx medusa db:generate tenant
```
Expected: a new migration file appears in `src/modules/tenant/migrations/`.

- [ ] **Step 3: Verify migration contents**

Run: `ls -t backend/apps/backend/src/modules/tenant/migrations/Migration*.ts | head -1 | xargs cat | head -40`
Expected: SQL that ALTERs the `tenant_vertical_check` constraint with the new value set (drops then re-adds the CHECK).

- [ ] **Step 4: Apply migration**

Run: `npx medusa db:migrate`
Expected: "Migration scripts completed".

- [ ] **Step 5: Verify the new constraint**

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'tenant_vertical_check';"
```
Expected: the CHECK clause lists `food, grocery, home, fashion, electronics, general` — no `flowers` or `vegetables`.

- [ ] **Step 6: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/modules/tenant/models/tenant.ts \
        backend/apps/backend/src/modules/tenant/migrations/
git commit -m "feat(tenant): replace vertical enum (drop flowers/vegetables, add grocery/home)

Aligns the tenant.vertical CHECK constraint with the new taxonomy
sections. vegetables/flowers had no shops; grocery/home matches the
current demo seed (FreshMart, Bayti) and the new taxonomy sections.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

## Phase 4 — Taxonomy seed + boot subscriber

### Task 4.1: syncTaxonomySeedWorkflow

**Files:**
- Create: `backend/apps/backend/src/workflows/sync-taxonomy-seed.ts`
- Create: `backend/apps/backend/src/workflows/__tests__/sync-taxonomy-seed.spec.ts`

- [ ] **Step 1: Write the workflow**

Create `backend/apps/backend/src/workflows/sync-taxonomy-seed.ts`:

```typescript
import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { TAXONOMY_TREE, flattenTree, type TreeNode } from "../taxonomy/tree"
import { getSchemaByHandle } from "../taxonomy/registry"

interface SyncStats {
  created: number
  updated: number
  unchanged: number
  total: number
}

const syncStep = createStep(
  "sync-taxonomy-tree",
  async (_input: void, { container }): Promise<StepResponse<SyncStats>> => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productSvc = container.resolve(Modules.PRODUCT) as any

    const nodes = flattenTree()
    const stats: SyncStats = { created: 0, updated: 0, unchanged: 0, total: nodes.length }

    // Pre-load existing taxonomy categories (those flagged with metadata.is_taxonomy)
    const allCategories = await productSvc.listProductCategories({}, { take: null })
    const byHandle: Map<string, any> = new Map(allCategories.map((c: any) => [c.handle, c]))

    // Build by depth so parents exist before children
    function depth(n: TreeNode): number {
      return n.handle.split(".").length
    }
    const sorted = [...nodes].sort((a, b) => depth(a) - depth(b))

    for (const node of sorted) {
      const parentHandle = node.handle.includes(".")
        ? node.handle.split(".").slice(0, -1).join(".")
        : null
      const parentRow = parentHandle ? byHandle.get(parentHandle) : null
      const desired = {
        name: node.display_name,
        handle: node.handle,
        is_internal: true,
        parent_category_id: parentRow?.id ?? null,
        metadata: {
          is_taxonomy: true,
          schema_handle: getSchemaByHandle(node.handle) ? node.handle : null,
        },
      }

      const existing = byHandle.get(node.handle)
      if (!existing) {
        const [created] = await productSvc.createProductCategories([desired])
        byHandle.set(node.handle, created)
        stats.created++
        logger.info(`[taxonomy] created ${node.handle}`)
      } else {
        // Detect drift
        const sameName = existing.name === desired.name
        const sameParent = (existing.parent_category_id ?? null) === (desired.parent_category_id ?? null)
        const sameSchema = (existing.metadata?.schema_handle ?? null) === (desired.metadata.schema_handle ?? null)
        if (sameName && sameParent && sameSchema) {
          stats.unchanged++
        } else {
          await productSvc.updateProductCategories(existing.id, desired)
          stats.updated++
          logger.info(`[taxonomy] updated ${node.handle}`)
        }
      }
    }

    logger.info(`[taxonomy] sync done: ${JSON.stringify(stats)}`)
    return new StepResponse(stats)
  }
)

export const syncTaxonomySeedWorkflow = createWorkflow(
  "sync-taxonomy-seed",
  () => {
    const stats = syncStep()
    return new WorkflowResponse(stats)
  }
)
```

- [ ] **Step 2: Write the integration test**

Create `backend/apps/backend/src/workflows/__tests__/sync-taxonomy-seed.spec.ts`:

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { syncTaxonomySeedWorkflow } from "../sync-taxonomy-seed"
import { flattenTree } from "../../taxonomy/tree"

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("syncTaxonomySeedWorkflow", () => {
      it("creates every node on a clean DB", async () => {
        const { result } = await syncTaxonomySeedWorkflow(getContainer()).run({})
        const expected = flattenTree().length
        expect(result.created).toBe(expected)
        expect(result.updated).toBe(0)
        expect(result.total).toBe(expected)
      })

      it("is idempotent — second run reports everything unchanged", async () => {
        await syncTaxonomySeedWorkflow(getContainer()).run({})
        const { result } = await syncTaxonomySeedWorkflow(getContainer()).run({})
        expect(result.created).toBe(0)
        expect(result.updated).toBe(0)
        expect(result.unchanged).toBe(flattenTree().length)
      })

      it("attaches schema_handle metadata only on leaves", async () => {
        await syncTaxonomySeedWorkflow(getContainer()).run({})
        const productSvc = getContainer().resolve("product") as any
        const all = await productSvc.listProductCategories({ handle: ["food", "food.pizza"] })
        const food = all.find((c: any) => c.handle === "food")
        const pizza = all.find((c: any) => c.handle === "food.pizza")
        expect(food.metadata.schema_handle).toBeNull()
        expect(pizza.metadata.schema_handle).toBe("food.pizza")
      })
    })
  },
})
```

- [ ] **Step 3: Run tests**

```bash
cd backend/apps/backend
npm run test:integration:modules -- sync-taxonomy-seed.spec.ts
```
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/workflows/sync-taxonomy-seed.ts \
        backend/apps/backend/src/workflows/__tests__/sync-taxonomy-seed.spec.ts
git commit -m "feat(taxonomy): syncTaxonomySeedWorkflow

Upserts product_category rows from TAXONOMY_TREE. Sets is_internal=true,
metadata.is_taxonomy=true, metadata.schema_handle=<handle> on leaves.
Idempotent: second run leaves everything unchanged. Detects drift on
name/parent/schema and updates.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 4.2: Boot subscriber to run the seed

**Files:**
- Create: `backend/apps/backend/src/subscribers/taxonomy-boot.ts`

- [ ] **Step 1: Create the subscriber**

Create `backend/apps/backend/src/subscribers/taxonomy-boot.ts`:

```typescript
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncTaxonomySeedWorkflow } from "../workflows/sync-taxonomy-seed"

export default async function taxonomyBootHandler({ container }: SubscriberArgs<unknown>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const { result } = await syncTaxonomySeedWorkflow(container).run({})
    logger.info(`[taxonomy] boot sync: ${JSON.stringify(result)}`)
  } catch (err) {
    logger.error(`[taxonomy] boot sync FAILED: ${(err as Error).message}`)
    // Do not crash boot — the sync can be re-run manually via the workflow
  }
}

export const config: SubscriberConfig = {
  event: "medusa.bootstrap.completed",
}
```

- [ ] **Step 2: Restart the dev server to trigger boot**

```bash
cd backend/apps/backend
# Kill any running dev server (Ctrl+C in its terminal), then:
npm run dev
```
Wait for the log line: `[taxonomy] boot sync: {"created":<N>,"updated":0,"unchanged":0,"total":<N>}` on first run.

Stop server. Restart it. Verify on second start: `[taxonomy] boot sync: {"created":0,"updated":0,"unchanged":<N>,"total":<N>}`.

- [ ] **Step 3: Verify the categories exist in the DB**

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db -c "SELECT count(*) FROM product_category WHERE metadata->>'is_taxonomy' = 'true' AND deleted_at IS NULL;"
```
Expected: matches `flattenTree().length` from Task 4.1 test (~37 — 5 sections + 32 categories).

- [ ] **Step 4: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/subscribers/taxonomy-boot.ts
git commit -m "feat(taxonomy): boot subscriber syncs tree on app start

Runs syncTaxonomySeedWorkflow on medusa.bootstrap.completed. Catches and
logs errors without crashing boot — the sync can be re-run via the
workflow directly if it fails (e.g., DB unavailable at boot).

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

## Phase 5 — Product taxonomy workflows

### Task 5.1: assignProductToTaxonomyWorkflow

**Files:**
- Create: `backend/apps/backend/src/workflows/assign-product-to-taxonomy.ts`
- Create: `backend/apps/backend/src/workflows/__tests__/assign-product-to-taxonomy.spec.ts`

- [ ] **Step 1: Write the workflow**

Create `backend/apps/backend/src/workflows/assign-product-to-taxonomy.ts`:

```typescript
import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { getSchemaByHandle } from "../taxonomy/registry"
import { validateCoreFields } from "../taxonomy/validate"

export interface AssignInput {
  product_id: string
  taxonomy_handle: string
  core_fields: Record<string, unknown>
  custom_fields?: Record<string, unknown>
}

const assignStep = createStep(
  "assign-product-to-taxonomy",
  async (input: AssignInput, { container }): Promise<StepResponse<{ product_id: string }>> => {
    const productSvc = container.resolve(Modules.PRODUCT) as any

    // 1. Resolve leaf schema
    const schema = getSchemaByHandle(input.taxonomy_handle)
    if (!schema) {
      throw new Error(`Unknown taxonomy handle: ${input.taxonomy_handle}`)
    }

    // 2. Validate core_fields
    const result = validateCoreFields(schema, input.core_fields)
    if (!result.ok) {
      const detail = result.errors.map((e) => `${e.key}: ${e.message}`).join("; ")
      throw new Error(`core_fields validation failed: ${detail}`)
    }

    // 3. Validate custom_fields: no collisions with core_fields keys
    if (input.custom_fields) {
      const coreKeys = new Set(schema.core_fields.map((f) => f.key))
      const collisions = Object.keys(input.custom_fields).filter((k) => coreKeys.has(k))
      if (collisions.length > 0) {
        throw new Error(`custom_fields key(s) collide with core_fields: ${collisions.join(", ")}`)
      }
    }

    // 4. Resolve the product_category id from the taxonomy handle
    const [taxonomyCat] = await productSvc.listProductCategories({ handle: input.taxonomy_handle })
    if (!taxonomyCat) {
      throw new Error(`product_category for handle ${input.taxonomy_handle} not found — has the seed run?`)
    }

    // 5. Fetch existing product + its current categories
    const product = await productSvc.retrieveProduct(input.product_id, { relations: ["categories"] })
    const otherCategoryIds = (product.categories ?? [])
      .filter((c: any) => c.metadata?.is_taxonomy !== true)
      .map((c: any) => c.id)

    // 6. Update product: replace any old taxonomy category with the new one,
    //    keep non-taxonomy categories (those are merch attachments managed separately).
    await productSvc.updateProducts(input.product_id, {
      metadata: {
        ...(product.metadata ?? {}),
        core_fields: input.core_fields,
        custom_fields: input.custom_fields ?? {},
      },
      category_ids: [taxonomyCat.id, ...otherCategoryIds],
    })

    return new StepResponse({ product_id: input.product_id })
  }
)

export const assignProductToTaxonomyWorkflow = createWorkflow(
  "assign-product-to-taxonomy",
  (input: AssignInput) => {
    const out = assignStep(input)
    return new WorkflowResponse(out)
  }
)
```

- [ ] **Step 2: Write the integration tests**

Create `backend/apps/backend/src/workflows/__tests__/assign-product-to-taxonomy.spec.ts`:

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { assignProductToTaxonomyWorkflow } from "../assign-product-to-taxonomy"
import { syncTaxonomySeedWorkflow } from "../sync-taxonomy-seed"

async function createTestProduct(getContainer: any) {
  const productSvc = getContainer().resolve("product") as any
  const [p] = await productSvc.createProducts([{
    title: "Test Pizza",
    handle: `test-pizza-${Date.now()}`,
    status: "published",
  }])
  return p
}

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    beforeAll(async () => {
      await syncTaxonomySeedWorkflow(getContainer()).run({})
    })

    describe("assignProductToTaxonomyWorkflow", () => {
      it("assigns happy-path core_fields and stores them in metadata", async () => {
        const p = await createTestProduct(getContainer)
        await assignProductToTaxonomyWorkflow(getContainer()).run({
          input: {
            product_id: p.id,
            taxonomy_handle: "food.pizza",
            core_fields: { size_in: "12", prep_min: 18, toppings: ["basil"], allergens: ["gluten"] },
          },
        })
        const productSvc = getContainer().resolve("product") as any
        const updated = await productSvc.retrieveProduct(p.id, { relations: ["categories"] })
        expect(updated.metadata.core_fields.size_in).toBe("12")
        expect(updated.metadata.core_fields.prep_min).toBe(18)
        expect(updated.categories.some((c: any) => c.handle === "food.pizza")).toBe(true)
      })

      it("rejects unknown taxonomy handle", async () => {
        const p = await createTestProduct(getContainer)
        await expect(assignProductToTaxonomyWorkflow(getContainer()).run({
          input: { product_id: p.id, taxonomy_handle: "not.a.real.handle", core_fields: {} },
        })).rejects.toThrow(/Unknown taxonomy handle/)
      })

      it("rejects missing required core_field", async () => {
        const p = await createTestProduct(getContainer)
        await expect(assignProductToTaxonomyWorkflow(getContainer()).run({
          input: { product_id: p.id, taxonomy_handle: "food.pizza", core_fields: { prep_min: 12 } },
        })).rejects.toThrow(/size_in is required/)
      })

      it("rejects custom_fields key collision with core_fields", async () => {
        const p = await createTestProduct(getContainer)
        await expect(assignProductToTaxonomyWorkflow(getContainer()).run({
          input: {
            product_id: p.id,
            taxonomy_handle: "food.pizza",
            core_fields: { size_in: "12", prep_min: 12 },
            custom_fields: { size_in: "BIG" },
          },
        })).rejects.toThrow(/collide with core_fields/)
      })
    })
  },
})
```

- [ ] **Step 3: Run tests**

```bash
cd backend/apps/backend
npm run test:integration:modules -- assign-product-to-taxonomy.spec.ts
```
Expected: PASS (4 tests).

- [ ] **Step 4: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/workflows/assign-product-to-taxonomy.ts \
        backend/apps/backend/src/workflows/__tests__/assign-product-to-taxonomy.spec.ts
git commit -m "feat(taxonomy): assignProductToTaxonomyWorkflow

Sets product.metadata.core_fields + .custom_fields after validating
against the leaf schema. Attaches the product to the taxonomy
product_category. Rejects unknown handle, validation failures, and
custom/core key collisions.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 5.2: createProductWithTaxonomyWorkflow

**Files:**
- Create: `backend/apps/backend/src/workflows/create-product-with-taxonomy.ts`
- Create: `backend/apps/backend/src/workflows/__tests__/create-product-with-taxonomy.spec.ts`

- [ ] **Step 1: Write the workflow**

Create `backend/apps/backend/src/workflows/create-product-with-taxonomy.ts`:

```typescript
import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { assignProductToTaxonomyWorkflow } from "./assign-product-to-taxonomy"

export interface CreateProductWithTaxonomyInput {
  tenant_id: string
  taxonomy_handle: string
  core_fields: Record<string, unknown>
  custom_fields?: Record<string, unknown>
  merch_category_ids?: string[]
  product: {
    title: string
    handle: string
    description?: string
    thumbnail?: string
    status?: "draft" | "published" | "proposed" | "rejected"
    images?: { url: string }[]
    sales_channels: { id: string }[]
    options?: { title: string; values: string[] }[]
    variants?: any[]
  }
}

export const createProductWithTaxonomyWorkflow = createWorkflow(
  "create-product-with-taxonomy",
  (input: CreateProductWithTaxonomyInput) => {
    // 1. Create the product via the standard Medusa workflow
    const createInput = transform(input, (i) => ({
      products: [{
        title: i.product.title,
        handle: i.product.handle,
        description: i.product.description,
        thumbnail: i.product.thumbnail,
        status: i.product.status ?? "published",
        images: i.product.images,
        sales_channels: i.product.sales_channels,
        options: i.product.options ?? [{ title: "Default", values: ["Default"] }],
        variants: i.product.variants ?? [{
          title: "Default",
          manage_inventory: false,
          options: { Default: "Default" },
        }],
      }],
    }))
    const { result: created } = createProductsWorkflow.runAsStep({ input: createInput })

    // 2. Assign taxonomy
    const assignInput = transform({ created, input }, ({ created, input }) => ({
      product_id: (created as any)[0].id,
      taxonomy_handle: input.taxonomy_handle,
      core_fields: input.core_fields,
      custom_fields: input.custom_fields,
    }))
    assignProductToTaxonomyWorkflow.runAsStep({ input: assignInput })

    return new WorkflowResponse(transform(created, (c) => ({ product_id: (c as any)[0].id })))
  }
)
```

- [ ] **Step 2: Write the integration test**

Create `backend/apps/backend/src/workflows/__tests__/create-product-with-taxonomy.spec.ts`:

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createProductWithTaxonomyWorkflow } from "../create-product-with-taxonomy"
import { syncTaxonomySeedWorkflow } from "../sync-taxonomy-seed"
import { createSalesChannelsWorkflow } from "@medusajs/medusa/core-flows"

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    beforeAll(async () => {
      await syncTaxonomySeedWorkflow(getContainer()).run({})
    })

    describe("createProductWithTaxonomyWorkflow", () => {
      it("creates a product with taxonomy assignment in one call", async () => {
        const { result: [channel] } = await createSalesChannelsWorkflow(getContainer()).run({
          input: { salesChannelsData: [{ name: `Test Shop ${Date.now()}` }] },
        })
        const { result } = await createProductWithTaxonomyWorkflow(getContainer()).run({
          input: {
            tenant_id: "tnt_test_cpwt",
            taxonomy_handle: "food.pizza",
            core_fields: { size_in: "12", prep_min: 18 },
            product: {
              title: "Margherita Combo",
              handle: `margherita-combo-${Date.now()}`,
              sales_channels: [{ id: channel.id }],
            },
          },
        })
        expect(result.product_id).toMatch(/^prod_/)

        const productSvc = getContainer().resolve("product") as any
        const p = await productSvc.retrieveProduct(result.product_id, { relations: ["categories"] })
        expect(p.metadata.core_fields.size_in).toBe("12")
        expect(p.categories.some((c: any) => c.handle === "food.pizza")).toBe(true)
      })

      it("fails atomically — product not created if taxonomy step fails", async () => {
        const { result: [channel] } = await createSalesChannelsWorkflow(getContainer()).run({
          input: { salesChannelsData: [{ name: `Test Shop 2 ${Date.now()}` }] },
        })
        const handle = `bad-product-${Date.now()}`
        await expect(createProductWithTaxonomyWorkflow(getContainer()).run({
          input: {
            tenant_id: "tnt_test_cpwt2",
            taxonomy_handle: "food.pizza",
            core_fields: { prep_min: 12 }, // missing required size_in
            product: { title: "Should not exist", handle, sales_channels: [{ id: channel.id }] },
          },
        })).rejects.toThrow()

        // confirm product does not exist (workflow should have rolled back)
        const productSvc = getContainer().resolve("product") as any
        const [hit] = await productSvc.listProducts({ handle })
        expect(hit).toBeUndefined()
      })
    })
  },
})
```

- [ ] **Step 3: Run tests**

```bash
cd backend/apps/backend
npm run test:integration:modules -- create-product-with-taxonomy.spec.ts
```
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/workflows/create-product-with-taxonomy.ts \
        backend/apps/backend/src/workflows/__tests__/create-product-with-taxonomy.spec.ts
git commit -m "feat(taxonomy): createProductWithTaxonomyWorkflow

Composes createProductsWorkflow + assignProductToTaxonomyWorkflow.
Atomic — failure in taxonomy step rolls back product creation. One
round-trip from the vendor portal.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

## Phase 6 — API routes

### Task 6.1: Store taxonomy routes (tree + leaves)

**Files:**
- Create: `backend/apps/backend/src/api/store/taxonomy/tree/route.ts`
- Create: `backend/apps/backend/src/api/store/taxonomy/leaves/[handle]/route.ts`
- Create: `backend/apps/backend/integration-tests/http/store-taxonomy.spec.ts`

- [ ] **Step 1: Create the tree route**

Create `backend/apps/backend/src/api/store/taxonomy/tree/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TAXONOMY_TREE } from "../../../../taxonomy/tree"

// GET /store/taxonomy/tree
// Returns the full Section→Category(→Sub-category) tree. Public (no auth).
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "public, max-age=300") // 5 minutes
  res.json({ tree: TAXONOMY_TREE })
}
```

- [ ] **Step 2: Create the leaves route**

Create `backend/apps/backend/src/api/store/taxonomy/leaves/[handle]/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSchemaByHandle } from "../../../../../taxonomy/registry"

// GET /store/taxonomy/leaves/:handle
// Returns the schema for a single leaf. 404 if not a leaf.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const handle = req.params.handle
  const schema = getSchemaByHandle(handle)
  if (!schema) {
    return res.status(404).json({ error: `No schema for handle "${handle}"` })
  }
  res.setHeader("Cache-Control", "public, max-age=300")
  res.json({ schema })
}
```

- [ ] **Step 3: Write integration tests**

Create `backend/apps/backend/integration-tests/http/store-taxonomy.spec.ts`:

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    describe("/store/taxonomy", () => {
      it("GET /tree returns the full hierarchy", async () => {
        const r = await api.get("/store/taxonomy/tree")
        expect(r.status).toBe(200)
        expect(Array.isArray(r.data.tree)).toBe(true)
        const food = r.data.tree.find((n: any) => n.handle === "food")
        expect(food).toBeDefined()
        expect(food.children.some((c: any) => c.handle === "food.pizza")).toBe(true)
      })

      it("GET /leaves/:handle returns schema for a known leaf", async () => {
        const r = await api.get("/store/taxonomy/leaves/food.pizza")
        expect(r.status).toBe(200)
        expect(r.data.schema.handle).toBe("food.pizza")
        expect(r.data.schema.core_fields.some((f: any) => f.key === "size_in")).toBe(true)
      })

      it("GET /leaves/:handle returns 404 for non-leaf", async () => {
        const r = await api.get("/store/taxonomy/leaves/food").catch((e) => e.response)
        expect(r.status).toBe(404)
      })

      it("GET /leaves/:handle returns 404 for unknown handle", async () => {
        const r = await api.get("/store/taxonomy/leaves/nope").catch((e) => e.response)
        expect(r.status).toBe(404)
      })
    })
  },
})
```

- [ ] **Step 4: Run tests**

```bash
cd backend/apps/backend
npm run test:integration:http -- store-taxonomy.spec.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/api/store/taxonomy/ \
        backend/apps/backend/integration-tests/http/store-taxonomy.spec.ts
git commit -m "feat(api): /store/taxonomy/tree + /leaves/:handle

Public endpoints — no auth. 5-minute cache-control. Clients read these
to render the Section/Category filter UI + the DetailsPanel form.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 6.2: Store merch-categories route

**Files:**
- Create: `backend/apps/backend/src/api/store/tenants/[slug]/merch-categories/route.ts`
- Create: `backend/apps/backend/integration-tests/http/store-merch.spec.ts`

- [ ] **Step 1: Create the route**

Create `backend/apps/backend/src/api/store/tenants/[slug]/merch-categories/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MERCH_MODULE } from "../../../../../modules/merch"
import { TENANT_MODULE } from "../../../../../modules/tenant"

// GET /store/tenants/:slug/merch-categories
// Returns the shop's flat merch buckets. Requires publishable API key
// (Medusa default for /store/* routes), no customer auth needed.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenantSvc = req.scope.resolve(TENANT_MODULE) as any
  const merchSvc = req.scope.resolve(MERCH_MODULE) as any

  const tenant = await tenantSvc.getBySlug(req.params.slug)
  if (!tenant) {
    return res.status(404).json({ error: `Shop "${req.params.slug}" not found` })
  }

  const categories = await merchSvc.listForTenant(tenant.id)
  res.json({
    tenant: { slug: tenant.slug, name: tenant.name },
    merch_categories: categories.map((c: any) => ({
      id: c.id,
      handle: c.handle,
      name: c.name,
      position: c.position,
      icon_url: c.icon_url,
    })),
  })
}
```

- [ ] **Step 2: Write tests**

Create `backend/apps/backend/integration-tests/http/store-merch.spec.ts`:

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { TENANT_MODULE } from "../../src/modules/tenant"
import { MERCH_MODULE } from "../../src/modules/merch"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("/store/tenants/:slug/merch-categories", () => {
      it("returns the shop's merch categories", async () => {
        const tenantSvc = getContainer().resolve(TENANT_MODULE) as any
        const merchSvc = getContainer().resolve(MERCH_MODULE) as any
        const [t] = await tenantSvc.createTenants([{
          slug: `s-${Date.now()}`,
          name: "Test Shop",
          approval_status: "approved",
        }])
        await merchSvc.createForTenant(t.id, { name: "Pizzas", position: 1 })
        await merchSvc.createForTenant(t.id, { name: "Burgers", position: 2 })

        const r = await api.get(`/store/tenants/${t.slug}/merch-categories`)
        expect(r.status).toBe(200)
        expect(r.data.tenant.slug).toBe(t.slug)
        expect(r.data.merch_categories.map((c: any) => c.name)).toEqual(["Pizzas", "Burgers"])
      })

      it("404s for unknown shop slug", async () => {
        const r = await api.get("/store/tenants/nope-shop/merch-categories").catch((e) => e.response)
        expect(r.status).toBe(404)
      })
    })
  },
})
```

- [ ] **Step 3: Run tests**

```bash
cd backend/apps/backend
npm run test:integration:http -- store-merch.spec.ts
```
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/api/store/tenants/ \
        backend/apps/backend/integration-tests/http/store-merch.spec.ts
git commit -m "feat(api): GET /store/tenants/:slug/merch-categories

Returns the shop's flat merch buckets with position + icon_url. 404 if
slug unknown. Used by mobile + storefront shop page to render merch
tabs / sections.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 6.3: Admin routes (merch CRUD + product taxonomy)

**Files:**
- Create: `backend/apps/backend/src/api/admin/tenants/[tenantId]/merch-categories/route.ts`
- Create: `backend/apps/backend/src/api/admin/tenants/[tenantId]/merch-categories/[id]/route.ts`
- Create: `backend/apps/backend/src/api/admin/products/[productId]/taxonomy/route.ts`
- Create: `backend/apps/backend/src/api/admin/products/[productId]/merch-categories/route.ts`
- Create: `backend/apps/backend/integration-tests/http/admin-merch.spec.ts`
- Create: `backend/apps/backend/src/api/middlewares.ts` (or modify existing)

- [ ] **Step 1: Add tenant-isolation helper**

Create or extend `backend/apps/backend/src/api/_lib/require-tenant-access.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../modules/tenant"

/**
 * Returns the tenant_id the calling user is allowed to manage, or null.
 * Super-admin gets the requested tenantId. Regular vendor gets their own.
 * Throws 403 by writing to res if mismatch.
 */
export async function requireTenantAccess(
  req: MedusaRequest,
  res: MedusaResponse,
  requestedTenantId: string
): Promise<string | null> {
  const actorId = (req as any).auth_context?.actor_id
  const actorType = (req as any).auth_context?.actor_type

  // Super-admin bypass
  if (actorType === "user" || actorType === "admin") {
    return requestedTenantId
  }

  // Vendor — must match their tenant
  const tenantSvc = req.scope.resolve(TENANT_MODULE) as any
  const tenant = await tenantSvc.getTenantForUser(actorId)
  if (!tenant || tenant.id !== requestedTenantId) {
    res.status(403).json({ error: "Forbidden: tenant mismatch" })
    return null
  }
  return tenant.id
}
```

- [ ] **Step 2: Create the merch-categories collection route**

Create `backend/apps/backend/src/api/admin/tenants/[tenantId]/merch-categories/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MERCH_MODULE } from "../../../../../modules/merch"
import { requireTenantAccess } from "../../../../_lib/require-tenant-access"

// GET — list merch categories for a tenant
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenantId = await requireTenantAccess(req, res, req.params.tenantId)
  if (!tenantId) return
  const merch = req.scope.resolve(MERCH_MODULE) as any
  const list = await merch.listForTenant(tenantId)
  res.json({ merch_categories: list })
}

// POST — create a new merch category for the tenant
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const tenantId = await requireTenantAccess(req, res, req.params.tenantId)
  if (!tenantId) return
  const merch = req.scope.resolve(MERCH_MODULE) as any
  const body = (req.body as any) || {}
  if (!body.name) {
    return res.status(400).json({ error: "name is required" })
  }
  try {
    const created = await merch.createForTenant(tenantId, body)
    res.status(201).json({ merch_category: created })
  } catch (e: any) {
    res.status(409).json({ error: e.message })
  }
}
```

- [ ] **Step 3: Create the merch-categories item route**

Create `backend/apps/backend/src/api/admin/tenants/[tenantId]/merch-categories/[id]/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MERCH_MODULE } from "../../../../../../modules/merch"
import { requireTenantAccess } from "../../../../../_lib/require-tenant-access"

// PATCH — rename / re-order / change icon
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const tenantId = await requireTenantAccess(req, res, req.params.tenantId)
  if (!tenantId) return
  const merch = req.scope.resolve(MERCH_MODULE) as any
  // Verify the merch_category belongs to this tenant
  const [row] = await merch.listMerchCategories({ id: req.params.id, tenant_id: tenantId })
  if (!row) return res.status(404).json({ error: "Not found" })
  const body = (req.body as any) || {}
  const allowed: any = {}
  if (typeof body.name === "string") allowed.name = body.name
  if (typeof body.position === "number") allowed.position = body.position
  if ("icon_url" in body) allowed.icon_url = body.icon_url
  const updated = await merch.updateMerchCategories(req.params.id, allowed)
  res.json({ merch_category: updated })
}

// DELETE — soft delete
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const tenantId = await requireTenantAccess(req, res, req.params.tenantId)
  if (!tenantId) return
  const merch = req.scope.resolve(MERCH_MODULE) as any
  const [row] = await merch.listMerchCategories({ id: req.params.id, tenant_id: tenantId })
  if (!row) return res.status(404).json({ error: "Not found" })
  await merch.deleteMerchCategories(req.params.id)
  res.status(204).end()
}
```

- [ ] **Step 4: Create the product-taxonomy route**

Create `backend/apps/backend/src/api/admin/products/[productId]/taxonomy/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assignProductToTaxonomyWorkflow } from "../../../../../workflows/assign-product-to-taxonomy"

// POST — set/change a product's taxonomy leaf (validates core_fields)
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body as any) || {}
  if (!body.taxonomy_handle) {
    return res.status(400).json({ error: "taxonomy_handle is required" })
  }
  if (!body.core_fields || typeof body.core_fields !== "object") {
    return res.status(400).json({ error: "core_fields must be an object" })
  }
  try {
    const { result } = await assignProductToTaxonomyWorkflow(req.scope).run({
      input: {
        product_id: req.params.productId,
        taxonomy_handle: body.taxonomy_handle,
        core_fields: body.core_fields,
        custom_fields: body.custom_fields,
      },
    })
    res.json({ product_id: result.product_id })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
```

- [ ] **Step 5: Create the product-merch-categories route (PUT — full replacement)**

Create `backend/apps/backend/src/api/admin/products/[productId]/merch-categories/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { MERCH_MODULE } from "../../../../../modules/merch"

// PUT — replace the full set of merch categories on a product
// Body: { merch_category_ids: string[] }
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const productSvc = req.scope.resolve(Modules.PRODUCT) as any
  const merch = req.scope.resolve(MERCH_MODULE) as any
  const body = (req.body as any) || {}
  const ids: string[] = Array.isArray(body.merch_category_ids) ? body.merch_category_ids : []

  // Look up product + its tenant (via sales_channel → tenant.sales_channel_id)
  const product = await productSvc.retrieveProduct(req.params.productId, { relations: ["sales_channels", "categories"] })
  const channelIds = (product.sales_channels ?? []).map((c: any) => c.id)
  if (channelIds.length === 0) {
    return res.status(400).json({ error: "Product has no sales_channel — cannot resolve tenant" })
  }
  // Confirm every requested merch_category belongs to a tenant that owns one of the product's sales channels
  const cats = await merch.listMerchCategories({ id: ids })
  // Resolve tenants per cat
  const tenantSvc = req.scope.resolve("tenant") as any
  for (const cat of cats) {
    const tenant = await tenantSvc.retrieveTenant(cat.tenant_id)
    if (!channelIds.includes(tenant.sales_channel_id)) {
      return res.status(403).json({ error: `merch_category ${cat.id} not owned by product's tenant` })
    }
  }
  if (cats.length !== ids.length) {
    return res.status(400).json({ error: "Some merch_category_ids do not exist" })
  }

  // Replace: remove existing non-taxonomy categories, add the new ones
  const existingNonTaxonomy = (product.categories ?? [])
    .filter((c: any) => c.metadata?.is_taxonomy !== true)
    .map((c: any) => c.id)
  const taxonomyIds = (product.categories ?? [])
    .filter((c: any) => c.metadata?.is_taxonomy === true)
    .map((c: any) => c.id)
  await productSvc.updateProducts(req.params.productId, {
    category_ids: [...taxonomyIds, ...ids],
  })
  res.json({ product_id: req.params.productId, merch_category_ids: ids })
}
```

- [ ] **Step 6: Write integration test for admin routes**

Create `backend/apps/backend/integration-tests/http/admin-merch.spec.ts`:

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { TENANT_MODULE } from "../../src/modules/tenant"
import { syncTaxonomySeedWorkflow } from "../../src/workflows/sync-taxonomy-seed"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    beforeAll(async () => {
      await syncTaxonomySeedWorkflow(getContainer()).run({})
    })

    describe("/admin/tenants/:tenantId/merch-categories", () => {
      it("creates and lists merch categories (super-admin)", async () => {
        const tenantSvc = getContainer().resolve(TENANT_MODULE) as any
        const [t] = await tenantSvc.createTenants([{
          slug: `am-${Date.now()}`, name: "AM Shop", approval_status: "approved",
        }])
        const create = await api.post(
          `/admin/tenants/${t.id}/merch-categories`,
          { name: "Pizzas" },
          { headers: { "x-medusa-access-token": process.env.MEDUSA_ADMIN_TOKEN ?? "" } }
        ).catch((e) => e.response)
        expect(create.status).toBe(201)
        expect(create.data.merch_category.handle).toBe("pizzas")

        const list = await api.get(
          `/admin/tenants/${t.id}/merch-categories`,
          { headers: { "x-medusa-access-token": process.env.MEDUSA_ADMIN_TOKEN ?? "" } }
        )
        expect(list.data.merch_categories).toHaveLength(1)
      })

      it("returns 409 on duplicate handle", async () => {
        const tenantSvc = getContainer().resolve(TENANT_MODULE) as any
        const [t] = await tenantSvc.createTenants([{
          slug: `am-dup-${Date.now()}`, name: "Dup Shop", approval_status: "approved",
        }])
        await api.post(
          `/admin/tenants/${t.id}/merch-categories`,
          { name: "Sides" },
          { headers: { "x-medusa-access-token": process.env.MEDUSA_ADMIN_TOKEN ?? "" } }
        )
        const dup = await api.post(
          `/admin/tenants/${t.id}/merch-categories`,
          { name: "Sides" },
          { headers: { "x-medusa-access-token": process.env.MEDUSA_ADMIN_TOKEN ?? "" } }
        ).catch((e) => e.response)
        expect(dup.status).toBe(409)
      })

      // Tenant-isolation test deferred to vendor-auth wiring. Super-admin
      // skips the check, so we cover the rejection path in unit-testing
      // requireTenantAccess directly if needed.
    })
  },
})
```

- [ ] **Step 7: Run tests**

```bash
cd backend/apps/backend
npm run test:integration:http -- admin-merch.spec.ts
```
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/api/admin/ \
        backend/apps/backend/src/api/_lib/ \
        backend/apps/backend/integration-tests/http/admin-merch.spec.ts
git commit -m "feat(api): admin merch-categories CRUD + product-taxonomy POST + product-merch PUT

Routes:
- GET/POST /admin/tenants/:tenantId/merch-categories
- PATCH/DELETE /admin/tenants/:tenantId/merch-categories/:id
- POST /admin/products/:productId/taxonomy
- PUT /admin/products/:productId/merch-categories (full replacement)

requireTenantAccess helper enforces vendor → own-tenant isolation.
Super-admin bypasses. Cross-tenant merch attachment returns 403.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

## Phase 7 — Mobile UI

### Task 7.1: API client + types for taxonomy & merch

**Files:**
- Create: `mobile/src/lib/api/taxonomy.ts`
- Create: `mobile/src/lib/api/merch.ts`
- Create: `mobile/src/lib/api/types.ts`

- [ ] **Step 1: Define shared types**

Create `mobile/src/lib/api/types.ts`:

```typescript
export type FieldType = "string" | "number" | "boolean" | "enum" | "string[]"

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required: boolean
  min?: number
  max?: number
  options?: string[]
  hint?: string
}

export interface LeafSchema {
  handle: string
  display_name: string
  parent: string
  core_fields: FieldDef[]
}

export interface TreeNode {
  handle: string
  display_name: string
  children: TreeNode[]
}

export interface MerchCategory {
  id: string
  handle: string
  name: string
  position: number
  icon_url: string | null
}
```

- [ ] **Step 2: Taxonomy API client**

Create `mobile/src/lib/api/taxonomy.ts`:

```typescript
import { LeafSchema, TreeNode } from "./types"

const BASE = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-publishable-api-key": PK, accept: "application/json" },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`)
  return (await res.json()) as T
}

export async function fetchTaxonomyTree(): Promise<TreeNode[]> {
  const data = await fetchJson<{ tree: TreeNode[] }>("/store/taxonomy/tree")
  return data.tree
}

export async function fetchLeafSchema(handle: string): Promise<LeafSchema | null> {
  try {
    const data = await fetchJson<{ schema: LeafSchema }>(`/store/taxonomy/leaves/${handle}`)
    return data.schema
  } catch (e: any) {
    if (e.message?.startsWith("404")) return null
    throw e
  }
}
```

- [ ] **Step 3: Merch API client**

Create `mobile/src/lib/api/merch.ts`:

```typescript
import { MerchCategory } from "./types"

const BASE = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export async function fetchShopMerchCategories(shopSlug: string): Promise<MerchCategory[]> {
  const res = await fetch(`${BASE}/store/tenants/${shopSlug}/merch-categories`, {
    headers: { "x-publishable-api-key": PK, accept: "application/json" },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const data = await res.json()
  return data.merch_categories as MerchCategory[]
}
```

- [ ] **Step 4: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add mobile/src/lib/api/
git commit -m "feat(mobile): API clients for taxonomy + merch endpoints

LeafSchema, TreeNode, MerchCategory types mirror the backend wire
format. fetch-based clients (no axios dependency) — Expo prefers fewer
deps.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 7.2: DetailsPanel + CartFab components

**Files:**
- Create: `mobile/src/components/DetailsPanel.tsx`
- Create: `mobile/src/components/CartFab.tsx`
- Create: `mobile/src/components/__tests__/DetailsPanel.test.tsx`

- [ ] **Step 1: Write the DetailsPanel test**

Create `mobile/src/components/__tests__/DetailsPanel.test.tsx`:

```typescript
import { render } from "@testing-library/react-native"
import { DetailsPanel } from "../DetailsPanel"
import type { LeafSchema } from "../../lib/api/types"

const PIZZA: LeafSchema = {
  handle: "food.pizza",
  display_name: "Pizza",
  parent: "food",
  core_fields: [
    { key: "size_in", label: "Size", type: "enum", required: true, options: ["10", "12"] },
    { key: "toppings", label: "Toppings", type: "string[]", required: false },
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, hint: "For shop ETA — not shown on product" },
    { key: "is_vegan", label: "Vegan", type: "boolean", required: false },
  ],
}

describe("DetailsPanel", () => {
  it("renders core_fields in schema order with their values", () => {
    const { queryByText } = render(
      <DetailsPanel
        schema={PIZZA}
        coreFields={{ size_in: "12", toppings: ["basil", "tomato"], prep_min: 18, is_vegan: false }}
        customFields={{ gluten_free: true }}
      />
    )
    expect(queryByText("Details")).toBeTruthy()
    expect(queryByText("Size")).toBeTruthy()
    expect(queryByText("12")).toBeTruthy()
    expect(queryByText("Toppings")).toBeTruthy()
    expect(queryByText("basil")).toBeTruthy()
    expect(queryByText("tomato")).toBeTruthy()
    // prep_min has hint "not shown on product" — should be hidden from customer
    expect(queryByText("18")).toBeNull()
    expect(queryByText("Prep time (min)")).toBeNull()
    expect(queryByText("Vegan")).toBeTruthy()
    // custom fields header + values
    expect(queryByText("Extras")).toBeTruthy()
    expect(queryByText("gluten_free")).toBeTruthy()
  })

  it("hides fields where value is undefined", () => {
    const { queryByText } = render(
      <DetailsPanel schema={PIZZA} coreFields={{ size_in: "12", prep_min: 18 }} customFields={{}} />
    )
    expect(queryByText("Toppings")).toBeNull()
    expect(queryByText("Vegan")).toBeNull()
  })

  it("omits Extras section when customFields is empty", () => {
    const { queryByText } = render(
      <DetailsPanel schema={PIZZA} coreFields={{ size_in: "12", prep_min: 18 }} customFields={{}} />
    )
    expect(queryByText("Extras")).toBeNull()
  })
})
```

- [ ] **Step 2: Implement DetailsPanel**

Create `mobile/src/components/DetailsPanel.tsx`:

```typescript
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "../theme/useTheme"
import type { LeafSchema, FieldDef } from "../lib/api/types"

interface Props {
  schema: LeafSchema
  coreFields: Record<string, unknown>
  customFields: Record<string, unknown>
}

/**
 * Renders schema-driven core_fields as a label:value list, then any
 * custom_fields below in a separate "Extras" panel. Header says "Details"
 * regardless of section — same component for food, fashion, electronics, etc.
 *
 * Fields whose schema hint contains "not shown on product" are filtered out
 * (used for prep_min — needed by backend ETA, not customer-visible).
 */
export function DetailsPanel({ schema, coreFields, customFields }: Props) {
  const { colors } = useTheme()
  const visibleFields = schema.core_fields.filter(
    (f) => coreFields[f.key] !== undefined && coreFields[f.key] !== null && !isHiddenFromCustomer(f)
  )
  const customEntries = Object.entries(customFields ?? {})

  return (
    <View>
      {visibleFields.length > 0 && (
        <View style={[styles.panel, { borderColor: colors.border }]}>
          <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.headerText, { color: colors.textMuted }]}>Details</Text>
          </View>
          {visibleFields.map((f) => (
            <View key={f.key} style={[styles.row, { borderColor: colors.border }]}>
              <Text style={[styles.key, { color: colors.textMuted }]}>{f.label}</Text>
              <Text style={[styles.val, { color: colors.text }]}>{formatValue(f, coreFields[f.key])}</Text>
            </View>
          ))}
        </View>
      )}

      {customEntries.length > 0 && (
        <View style={[styles.extras, { backgroundColor: colors.surface }]}>
          <Text style={[styles.extrasHeader, { color: colors.textMuted }]}>Extras</Text>
          {customEntries.map(([k, v]) => (
            <View key={k} style={styles.extraRow}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{k}</Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>{String(v)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function isHiddenFromCustomer(f: FieldDef): boolean {
  return (f.hint ?? "").toLowerCase().includes("not shown on product")
}

function formatValue(f: FieldDef, v: unknown): string {
  if (f.type === "boolean") return v ? "Yes" : "No"
  if (f.type === "string[]" && Array.isArray(v)) return v.join(", ")
  return String(v)
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 12, marginTop: 12, overflow: "hidden" },
  header: { padding: 10, borderBottomWidth: 1 },
  headerText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  row: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  key: { flex: 1, fontSize: 14 },
  val: { flex: 1.4, fontSize: 14, fontWeight: "500", textAlign: "right" },
  extras: { borderRadius: 12, padding: 12, marginTop: 12 },
  extrasHeader: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 },
  extraRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
})
```

- [ ] **Step 3: Implement CartFab**

Create `mobile/src/components/CartFab.tsx`:

```typescript
import { TouchableOpacity, View, Text, StyleSheet } from "react-native"
import { useTheme } from "../theme/useTheme"

interface Props {
  itemCount: number
  onPress: () => void
}

/**
 * Small circle floating action button. Bottom-right. Shows item count in a
 * saffron badge. Hidden when itemCount === 0. InstaShop / Talabat pattern.
 */
export function CartFab({ itemCount, onPress }: Props) {
  const { colors } = useTheme()
  if (itemCount <= 0) return null
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrap}>
      <View style={[styles.fab, { backgroundColor: colors.primary }]}>
        <Text style={styles.icon}>🛒</Text>
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{itemCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", bottom: 24, right: 24, zIndex: 100 },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 8,
  },
  icon: { fontSize: 22 },
  badge: {
    position: "absolute", top: -4, right: -4,
    minWidth: 22, height: 22, borderRadius: 11,
    paddingHorizontal: 6,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "white",
  },
  badgeText: { fontSize: 11, fontWeight: "800" },
})
```

- [ ] **Step 4: Run tests**

```bash
cd mobile
npx jest src/components/__tests__/DetailsPanel.test.tsx
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add mobile/src/components/DetailsPanel.tsx \
        mobile/src/components/CartFab.tsx \
        mobile/src/components/__tests__/DetailsPanel.test.tsx
git commit -m "feat(mobile): DetailsPanel + CartFab components

DetailsPanel renders schema-driven core_fields + customFields. Header is
'Details' for every section (multi-industry coherence). Hides fields
whose schema hint includes 'not shown on product' (prep_min etc).

CartFab is a small circle FAB bottom-right, saffron badge with count,
hides when count === 0. InstaShop / Talabat pattern.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 7.3: MerchTabs + FilterChips + ProductCard cleanup

**Files:**
- Create: `mobile/src/components/MerchTabs.tsx`
- Create: `mobile/src/components/FilterChips.tsx`
- Modify: `mobile/src/components/ProductCard.tsx`

- [ ] **Step 1: Implement MerchTabs**

Create `mobile/src/components/MerchTabs.tsx`:

```typescript
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from "react-native"
import { useTheme } from "../theme/useTheme"
import type { MerchCategory } from "../lib/api/types"

interface Props {
  categories: MerchCategory[]
  activeHandle: string | null
  onSelect: (handle: string) => void
}

export function MerchTabs({ categories, activeHandle, onSelect }: Props) {
  const { colors } = useTheme()
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {categories.map((c) => {
          const active = c.handle === activeHandle
          return (
            <TouchableOpacity
              key={c.handle}
              onPress={() => onSelect(c.handle)}
              style={[
                styles.tab,
                { backgroundColor: active ? colors.text : colors.surface },
              ]}
            >
              <Text style={[
                styles.label,
                { color: active ? "white" : colors.textMuted },
              ]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginRight: 8 },
  label: { fontSize: 13, fontWeight: "600" },
})
```

- [ ] **Step 2: Implement FilterChips**

Create `mobile/src/components/FilterChips.tsx`:

```typescript
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from "react-native"
import { useTheme } from "../theme/useTheme"

export interface ChipDef {
  id: string
  label: string
  active: boolean
  hasCaret?: boolean
  prefix?: string // e.g., "⚡"
}

interface Props {
  chips: ChipDef[]
  onPress: (id: string) => void
}

export function FilterChips({ chips, onPress }: Props) {
  const { colors } = useTheme()
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((c) => (
        <TouchableOpacity key={c.id} onPress={() => onPress(c.id)} style={[
          styles.chip,
          { backgroundColor: c.active ? colors.primary : colors.surface },
        ]}>
          <Text style={[styles.label, { color: c.active ? "white" : colors.textMuted }]}>
            {c.prefix ? `${c.prefix} ` : ""}{c.label}{c.hasCaret ? " ▾" : ""}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, marginRight: 8 },
  label: { fontSize: 13, fontWeight: "600" },
})
```

- [ ] **Step 3: Strip prep time from ProductCard**

In `mobile/src/components/ProductCard.tsx`, remove any prop / line that renders prep time, prep_min, or "⏱". The customer-facing card shows only: image, title, price, add (+) button. Verify by searching: `grep -n "prep\|⏱" mobile/src/components/ProductCard.tsx` — should return nothing after this step.

- [ ] **Step 4: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add mobile/src/components/MerchTabs.tsx \
        mobile/src/components/FilterChips.tsx \
        mobile/src/components/ProductCard.tsx
git commit -m "feat(mobile): MerchTabs + FilterChips; ProductCard prep-time removed

MerchTabs is a sticky horizontal pill row for shop pages. FilterChips
is the same primitive for search filters. ProductCard is now
image+title+price+add only — no per-item time visible to customer.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 7.4: Wire components into shop / product / search screens

**Files:**
- Modify: `mobile/src/app/shop/[slug].tsx` (or wherever shop screen lives)
- Modify: `mobile/src/app/product/[id].tsx`
- Modify: `mobile/src/app/search.tsx`

- [ ] **Step 1: Confirm screen paths**

Run: `find mobile/src -name "*.tsx" -path "*shop*" -o -name "*.tsx" -path "*product*" -o -name "*.tsx" -path "*search*" | head -10`

Expected: locate the three target screens. If they don't exist yet, create them at the paths above following Expo Router conventions.

- [ ] **Step 2: Shop screen — wire MerchTabs + CartFab**

In the shop screen file, at the top of the component:

```typescript
import { useEffect, useState } from "react"
import { View, ScrollView } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { MerchTabs } from "../../components/MerchTabs"
import { CartFab } from "../../components/CartFab"
import { fetchShopMerchCategories } from "../../lib/api/merch"
import type { MerchCategory } from "../../lib/api/types"
import { useCart } from "../../hooks/useCart" // existing or stub returning { itemCount: number }
```

Inside the component:

```typescript
const { slug } = useLocalSearchParams<{ slug: string }>()
const router = useRouter()
const [merch, setMerch] = useState<MerchCategory[]>([])
const [activeMerch, setActiveMerch] = useState<string | null>(null)
const { itemCount } = useCart()

useEffect(() => {
  if (!slug) return
  fetchShopMerchCategories(slug).then((cats) => {
    setMerch(cats)
    setActiveMerch(cats[0]?.handle ?? null)
  }).catch(console.error)
}, [slug])

// In the render:
return (
  <View style={{ flex: 1 }}>
    <ScrollView /* ...existing shop header + products grouped by activeMerch... */ >
      <MerchTabs categories={merch} activeHandle={activeMerch} onSelect={setActiveMerch} />
      {/* products grouped by activeMerch */}
    </ScrollView>
    <CartFab itemCount={itemCount} onPress={() => router.push("/cart")} />
  </View>
)
```

- [ ] **Step 3: Product detail screen — wire DetailsPanel + top-right cart icon**

In the product detail screen:

```typescript
import { fetchLeafSchema } from "../../lib/api/taxonomy"
import { DetailsPanel } from "../../components/DetailsPanel"
import { CartFab } from "../../components/CartFab"
import type { LeafSchema } from "../../lib/api/types"
```

Add state for schema:

```typescript
const [schema, setSchema] = useState<LeafSchema | null>(null)

useEffect(() => {
  // product is loaded — pick its taxonomy leaf from product.categories
  const taxonomyCat = product?.categories?.find((c: any) => c.metadata?.is_taxonomy === true)
  if (!taxonomyCat) return
  fetchLeafSchema(taxonomyCat.handle).then(setSchema).catch(console.error)
}, [product])
```

Insert after the description, before the sticky add-to-cart bar:

```typescript
{schema && (
  <DetailsPanel
    schema={schema}
    coreFields={product.metadata?.core_fields ?? {}}
    customFields={product.metadata?.custom_fields ?? {}}
  />
)}
```

Mount CartFab at the top of the return (it's positioned absolute):

```typescript
<CartFab itemCount={itemCount} onPress={() => router.push("/cart")} />
```

- [ ] **Step 4: Search screen — wire FilterChips + CartFab**

In the search screen:

```typescript
import { useEffect, useMemo, useState } from "react"
import { FilterChips, ChipDef } from "../components/FilterChips"
import { CartFab } from "../components/CartFab"
import { fetchTaxonomyTree } from "../lib/api/taxonomy"
import type { TreeNode } from "../lib/api/types"

const [tree, setTree] = useState<TreeNode[]>([])
const [section, setSection] = useState<string | null>(null)
const [category, setCategory] = useState<string | null>(null)
const [fastOnly, setFastOnly] = useState(false)
const [maxPrice, setMaxPrice] = useState<number | null>(null)
const [sort, setSort] = useState<"best" | "cheapest" | "fastest">("best")

useEffect(() => { fetchTaxonomyTree().then(setTree).catch(console.error) }, [])

const chips: ChipDef[] = useMemo(() => [
  { id: "section", label: section ? `Section: ${section}` : "Section", active: !!section, hasCaret: true },
  { id: "category", label: category ? `Category: ${category}` : "Category", active: !!category, hasCaret: true },
  { id: "fast", label: "Fast delivery", active: fastOnly, prefix: "⚡" },
  { id: "price", label: maxPrice ? `Under ${maxPrice}` : "Price", active: !!maxPrice, hasCaret: true },
  { id: "sort", label: `Sort: ${sort}`, active: false, hasCaret: true },
], [section, category, fastOnly, maxPrice, sort])

function onChip(id: string) {
  switch (id) {
    case "fast": setFastOnly((x) => !x); break
    case "section": /* open section picker sheet */; break
    case "category": /* open category picker sheet */; break
    case "price": /* open price picker sheet */; break
    case "sort": /* open sort picker sheet */; break
  }
}

// In render — insert below the search input:
<FilterChips chips={chips} onPress={onChip} />
<CartFab itemCount={itemCount} onPress={() => router.push("/cart")} />
```

For the picker sheets (section / category / price / sort): use Expo's bottom-sheet pattern if available, or react-native-modal — implementations are local UI plumbing, not architectural. Use existing patterns in the app if present.

- [ ] **Step 5: Smoke test in Expo Go**

```bash
cd mobile
npx expo start --clear
```
On a connected device or simulator:
1. Open the app, navigate to a shop. Verify MerchTabs renders, scrolls horizontally, tapping a tab updates the visible products.
2. Tap a product. Verify the DetailsPanel renders with schema-driven fields and "Details" header.
3. Add an item to cart from anywhere. Verify the CartFab appears bottom-right with the right badge count.
4. Navigate to search. Type "pizza". Verify FilterChips appears. Tap "⚡ Fast delivery" — verify chip toggles to active color.

If anything misbehaves, fix it before moving on. The user explicitly said "test more, claim less" (item 14 of UX feedback).

- [ ] **Step 6: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add mobile/src/app/
git commit -m "feat(mobile): wire MerchTabs + DetailsPanel + CartFab + FilterChips into screens

Shop screen: sticky MerchTabs, products grouped by active merch handle,
CartFab bottom-right.
Product screen: DetailsPanel below description rendering schema fields,
CartFab top-right (existing add-to-cart bar at bottom unchanged).
Search screen: FilterChips for Section / Category / Fast / Price / Sort.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

## Phase 8 — Storefront (web) UI

The storefront mirrors mobile: same API contracts, same conceptual components, same UX behaviour. Implementation uses Next.js 15 + React Server Components where possible; client components only where state is needed (chips, FAB).

### Task 8.1: Storefront DetailsPanel + CartFab + types

**Files:**
- Create: `backend/apps/storefront/src/lib/types/taxonomy.ts`
- Create: `backend/apps/storefront/src/lib/data/taxonomy.ts`
- Create: `backend/apps/storefront/src/lib/data/merch.ts`
- Create: `backend/apps/storefront/src/modules/products/components/details-panel/index.tsx`
- Create: `backend/apps/storefront/src/modules/layout/components/cart-fab/index.tsx`

- [ ] **Step 1: Shared types**

Create `backend/apps/storefront/src/lib/types/taxonomy.ts` with the same `FieldType / FieldDef / LeafSchema / TreeNode / MerchCategory` interfaces as the mobile counterpart (copy the type bodies from `mobile/src/lib/api/types.ts` verbatim).

- [ ] **Step 2: Server-side fetchers**

Create `backend/apps/storefront/src/lib/data/taxonomy.ts`:

```typescript
import "server-only"
import { sdk } from "@lib/config" // existing storefront medusa sdk
import { LeafSchema, TreeNode } from "../types/taxonomy"

export async function getTaxonomyTree(): Promise<TreeNode[]> {
  const r = await fetch(`${process.env.MEDUSA_BACKEND_URL}/store/taxonomy/tree`, {
    headers: { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "" },
    next: { revalidate: 300, tags: ["taxonomy"] },
  })
  if (!r.ok) return []
  const data = await r.json()
  return data.tree
}

export async function getLeafSchema(handle: string): Promise<LeafSchema | null> {
  const r = await fetch(`${process.env.MEDUSA_BACKEND_URL}/store/taxonomy/leaves/${handle}`, {
    headers: { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "" },
    next: { revalidate: 300, tags: [`taxonomy-leaf-${handle}`] },
  })
  if (!r.ok) return null
  const data = await r.json()
  return data.schema
}
```

Create `backend/apps/storefront/src/lib/data/merch.ts`:

```typescript
import "server-only"
import { MerchCategory } from "../types/taxonomy"

export async function getShopMerchCategories(shopSlug: string): Promise<MerchCategory[]> {
  const r = await fetch(`${process.env.MEDUSA_BACKEND_URL}/store/tenants/${shopSlug}/merch-categories`, {
    headers: { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "" },
    next: { revalidate: 60, tags: [`merch-${shopSlug}`] },
  })
  if (!r.ok) return []
  const data = await r.json()
  return data.merch_categories
}
```

- [ ] **Step 3: DetailsPanel (React Server Component)**

Create `backend/apps/storefront/src/modules/products/components/details-panel/index.tsx`:

```tsx
import type { LeafSchema, FieldDef } from "@lib/types/taxonomy"

interface Props {
  schema: LeafSchema
  coreFields: Record<string, unknown>
  customFields: Record<string, unknown>
}

function isHiddenFromCustomer(f: FieldDef): boolean {
  return (f.hint ?? "").toLowerCase().includes("not shown on product")
}

function formatValue(f: FieldDef, v: unknown): string {
  if (f.type === "boolean") return v ? "Yes" : "No"
  if (f.type === "string[]" && Array.isArray(v)) return v.join(", ")
  return String(v)
}

export default function DetailsPanel({ schema, coreFields, customFields }: Props) {
  const visible = schema.core_fields.filter(
    (f) => coreFields[f.key] !== undefined && coreFields[f.key] !== null && !isHiddenFromCustomer(f)
  )
  const customEntries = Object.entries(customFields ?? {})

  return (
    <div className="space-y-3 mt-4">
      {visible.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Details</span>
          </div>
          {visible.map((f) => (
            <div key={f.key} className="flex justify-between px-4 py-2.5 border-b border-gray-100 last:border-b-0 text-sm">
              <span className="text-gray-500">{f.label}</span>
              <span className="font-medium text-gray-900">{formatValue(f, coreFields[f.key])}</span>
            </div>
          ))}
        </div>
      )}

      {customEntries.length > 0 && (
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Extras</div>
          {customEntries.map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 text-[13px]">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-900">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: CartFab (client component)**

Create `backend/apps/storefront/src/modules/layout/components/cart-fab/index.tsx`:

```tsx
"use client"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@lib/context/cart-context" // existing or stub

export default function CartFab() {
  const { cart } = useCart()
  const count = cart?.items?.length ?? 0
  if (count === 0) return null
  return (
    <Link
      href="/cart"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-teal-700 text-white flex items-center justify-center shadow-lg hover:bg-teal-800 transition-colors"
    >
      <ShoppingCart size={22} />
      <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-500 text-gray-900 text-[11px] font-extrabold flex items-center justify-center border-2 border-white">
        {count}
      </span>
    </Link>
  )
}
```

- [ ] **Step 5: Mount CartFab in the storefront root layout**

Modify `backend/apps/storefront/src/app/[countryCode]/(main)/layout.tsx` (or the closest equivalent). Add:

```tsx
import CartFab from "@modules/layout/components/cart-fab"

// In the JSX, after main content:
<CartFab />
```

- [ ] **Step 6: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/storefront/src/lib/ \
        backend/apps/storefront/src/modules/products/components/details-panel/ \
        backend/apps/storefront/src/modules/layout/components/cart-fab/ \
        backend/apps/storefront/src/app/
git commit -m "feat(storefront): DetailsPanel + CartFab + taxonomy/merch data layer

Same conceptual contract as the mobile equivalents. Tailwind for
styling. Cart FAB mounted in root layout — appears on every page when
cart has items.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 8.2: Storefront shop page with merch tabs

**Files:**
- Create or Modify: `backend/apps/storefront/src/app/[countryCode]/(main)/shop/[handle]/page.tsx`
- Create: `backend/apps/storefront/src/modules/shops/components/merch-tabs/index.tsx`

- [ ] **Step 1: MerchTabs client component**

Create `backend/apps/storefront/src/modules/shops/components/merch-tabs/index.tsx`:

```tsx
"use client"
import { useState } from "react"
import type { MerchCategory } from "@lib/types/taxonomy"

interface Props {
  categories: MerchCategory[]
  productsByMerch: Record<string, any[]>
}

export default function MerchTabs({ categories, productsByMerch }: Props) {
  const [active, setActive] = useState(categories[0]?.handle ?? "")
  const visible = productsByMerch[active] ?? []
  return (
    <>
      <div className="sticky top-16 bg-white border-b border-gray-200 z-10 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
          {categories.map((c) => (
            <button
              key={c.handle}
              onClick={() => setActive(c.handle)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
                c.handle === active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  )
}

function ProductCard({ product }: { product: any }) {
  return (
    <a href={`/products/${product.handle}`} className="border border-gray-200 rounded-xl overflow-hidden hover:border-teal-700 transition">
      <div className="aspect-square bg-gray-100" style={{ backgroundImage: `url(${product.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="p-3">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.title}</h3>
        <div className="flex justify-between items-center">
          <span className="font-bold text-base">{product.formatted_price}</span>
          <button className="w-8 h-8 bg-teal-700 text-white rounded-lg text-lg font-semibold">+</button>
        </div>
      </div>
    </a>
  )
}
```

- [ ] **Step 2: Shop page (server component)**

Create `backend/apps/storefront/src/app/[countryCode]/(main)/shop/[handle]/page.tsx`:

```tsx
import { notFound } from "next/navigation"
import { getShopMerchCategories } from "@lib/data/merch"
import { sdk } from "@lib/config" // existing
import MerchTabs from "@modules/shops/components/merch-tabs"

interface Props {
  params: Promise<{ countryCode: string; handle: string }>
}

export default async function ShopPage(props: Props) {
  const { handle } = await props.params

  // Fetch shop info via existing tenant API or sales channel
  const shopRes = await fetch(`${process.env.MEDUSA_BACKEND_URL}/store/tenants/${handle}/merch-categories`, {
    headers: { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "" },
    cache: "no-store",
  })
  if (!shopRes.ok) notFound()
  const { tenant, merch_categories } = await shopRes.json()

  // Fetch products in this shop's sales channel — use existing storefront sdk
  // listProducts and filter / group by merch_category in product.categories
  const products = await sdk.client.fetch<any>(`/store/products?sales_channel_id=${tenant.sales_channel_id}&limit=200`, {
    headers: { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "" },
  })
  const list = products.products ?? []

  const byMerch: Record<string, any[]> = {}
  for (const m of merch_categories) byMerch[m.handle] = []
  for (const p of list) {
    for (const c of p.categories ?? []) {
      if (byMerch[c.handle]) byMerch[c.handle].push(p)
    }
  }

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">{tenant.name}</h1>
      <MerchTabs categories={merch_categories} productsByMerch={byMerch} />
    </div>
  )
}
```

- [ ] **Step 3: Visit and verify**

```bash
cd backend/apps/storefront
npm run dev
```

Open `http://localhost:8000/iq/shop/hamzas-kitchen` (substitute the real slug). Verify: shop name renders, merch tabs scroll horizontally, clicking tabs swaps the product grid.

- [ ] **Step 4: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/storefront/src/app/\[countryCode\]/\(main\)/shop/ \
        backend/apps/storefront/src/modules/shops/
git commit -m "feat(storefront): shop page with merch tabs

Server-renders the shop, fetches merch categories + products, groups
products by merch_category, hands off to client MerchTabs for tab
switching. No per-item time displayed.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 8.3: Storefront product detail + search

**Files:**
- Modify: `backend/apps/storefront/src/app/[countryCode]/(main)/products/[handle]/page.tsx`
- Create: `backend/apps/storefront/src/app/[countryCode]/(main)/search/page.tsx`
- Create: `backend/apps/storefront/src/modules/search/components/filter-chips/index.tsx`

- [ ] **Step 1: Add DetailsPanel to product page**

In `backend/apps/storefront/src/app/[countryCode]/(main)/products/[handle]/page.tsx`, after fetching the product, also fetch the leaf schema and pass to DetailsPanel:

```tsx
import { getLeafSchema } from "@lib/data/taxonomy"
import DetailsPanel from "@modules/products/components/details-panel"

// ... existing product fetch ...

const taxonomyCat = product.categories?.find((c: any) => c.metadata?.is_taxonomy === true)
const schema = taxonomyCat ? await getLeafSchema(taxonomyCat.handle) : null

// In the JSX, after the description block:
{schema && (
  <DetailsPanel
    schema={schema}
    coreFields={product.metadata?.core_fields ?? {}}
    customFields={product.metadata?.custom_fields ?? {}}
  />
)}
```

- [ ] **Step 2: FilterChips client component**

Create `backend/apps/storefront/src/modules/search/components/filter-chips/index.tsx`:

```tsx
"use client"
import { useState } from "react"

export interface ChipDef {
  id: string
  label: string
  active: boolean
  prefix?: string
  hasCaret?: boolean
}

interface Props {
  chips: ChipDef[]
  onToggle: (id: string) => void
}

export default function FilterChips({ chips, onToggle }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
      {chips.map((c) => (
        <button key={c.id} onClick={() => onToggle(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-semibold ${
          c.active ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-600"
        }`}>
          {c.prefix ? `${c.prefix} ` : ""}{c.label}{c.hasCaret ? " ▾" : ""}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Search page**

Create `backend/apps/storefront/src/app/[countryCode]/(main)/search/page.tsx`:

```tsx
"use client"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import FilterChips, { ChipDef } from "@modules/search/components/filter-chips"

export default function SearchPage() {
  const params = useSearchParams()
  const router = useRouter()
  const q = params.get("q") ?? ""
  const [section, setSection] = useState<string | null>(params.get("section"))
  const [category, setCategory] = useState<string | null>(params.get("category"))
  const [fastOnly, setFastOnly] = useState(params.get("fast") === "1")
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (section) sp.set("section", section)
    if (category) sp.set("category", category)
    if (fastOnly) sp.set("fast", "1")
    fetch(`/api/storefront-search?${sp.toString()}`)
      .then((r) => r.json()).then((d) => setResults(d.results ?? []))
      .catch(() => setResults([]))
  }, [q, section, category, fastOnly])

  const chips: ChipDef[] = [
    { id: "section", label: section ? `Section: ${section}` : "Section", active: !!section, hasCaret: true },
    { id: "category", label: category ? `Category: ${category}` : "Category", active: !!category, hasCaret: true },
    { id: "fast", label: "Fast delivery", active: fastOnly, prefix: "⚡" },
  ]

  function onChip(id: string) {
    if (id === "fast") setFastOnly((x) => !x)
    // section/category open a dropdown — implementation pattern depends on existing storefront UI primitives
  }

  return (
    <div className="px-4 py-4 max-w-screen-md mx-auto">
      <input
        defaultValue={q}
        placeholder="Search products, shops…"
        className="w-full px-4 py-3 bg-gray-100 rounded-xl"
        onKeyDown={(e) => { if (e.key === "Enter") router.push(`/search?q=${(e.target as HTMLInputElement).value}`) }}
      />
      <FilterChips chips={chips} onToggle={onChip} />
      <div className="text-xs text-gray-500 mb-2">{results.length} results</div>
      {results.map((r) => (
        <a key={r.id} href={`/products/${r.handle}`} className="flex gap-3 py-3 border-b border-gray-200">
          <div className="w-20 h-20 rounded-lg bg-gray-100" style={{ backgroundImage: `url(${r.thumbnail})`, backgroundSize: "cover" }} />
          <div className="flex-1">
            <h3 className="font-semibold text-[15px]">{r.title}</h3>
            <p className="text-xs text-gray-500">{r.shop_name} · Delivery {r.shop_delivery}</p>
            <div className="font-bold text-sm mt-1">{r.formatted_price}</div>
          </div>
        </a>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Backend route to power storefront search (basic version)**

Create `backend/apps/backend/src/api/store/products/search/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// GET /store/products/search?q=&section=&category=&fast=1
// Naive implementation: load products, filter in memory. v0-grade — replace
// with proper Postgres full-text or Meilisearch in a later sub-project.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productSvc = req.scope.resolve(Modules.PRODUCT) as any
  const q = (req.query.q as string ?? "").toLowerCase().trim()
  const section = req.query.section as string | undefined
  const category = req.query.category as string | undefined

  // Pull a reasonable cap. For v0 with 32 demo products this is fine.
  const all = await productSvc.listProducts(
    { status: ["published"] },
    { take: 500, relations: ["categories", "variants"] }
  )

  const filtered = all.filter((p: any) => {
    if (q && !(p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))) return false
    if (section) {
      const taxonomyCat = p.categories?.find((c: any) => c.metadata?.is_taxonomy)
      if (!taxonomyCat?.handle?.startsWith(`${section}.`) && taxonomyCat?.handle !== section) return false
    }
    if (category) {
      const taxonomyCat = p.categories?.find((c: any) => c.metadata?.is_taxonomy)
      if (taxonomyCat?.handle !== category && !taxonomyCat?.handle?.startsWith(`${category}.`)) return false
    }
    return true
  })

  res.json({ results: filtered.slice(0, 50) })
}
```

- [ ] **Step 5: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/storefront/src/app/\[countryCode\]/\(main\)/products/ \
        backend/apps/storefront/src/app/\[countryCode\]/\(main\)/search/ \
        backend/apps/storefront/src/modules/search/ \
        backend/apps/backend/src/api/store/products/search/
git commit -m "feat(storefront): product detail DetailsPanel + search page

Product detail loads the leaf schema server-side and renders DetailsPanel
below the description. Search page has filter chips + naive in-memory
search backed by /store/products/search. Section/category filter scope
to taxonomy.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

## Phase 9 — Vendor portal: create-product wizard

### Task 9.1: Category cascade picker (2-level default + advanced)

**Files:**
- Create: `backend/apps/vendor/src/components/create-product/CategoryPicker.tsx`
- Create: `backend/apps/vendor/src/lib/api/taxonomy.ts`

- [ ] **Step 1: Vendor-side taxonomy API client**

Create `backend/apps/vendor/src/lib/api/taxonomy.ts`:

```typescript
import type { LeafSchema, TreeNode } from "../types"

const BASE = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

export async function fetchTree(): Promise<TreeNode[]> {
  const r = await fetch(`${BASE}/store/taxonomy/tree`, { cache: "force-cache" })
  if (!r.ok) return []
  return (await r.json()).tree
}

export async function fetchLeafSchema(handle: string): Promise<LeafSchema | null> {
  const r = await fetch(`${BASE}/store/taxonomy/leaves/${handle}`, { cache: "force-cache" })
  if (!r.ok) return null
  return (await r.json()).schema
}
```

(Copy the `LeafSchema / FieldDef / TreeNode` types from the mobile/storefront type files into `backend/apps/vendor/src/lib/types.ts`.)

- [ ] **Step 2: CategoryPicker component**

Create `backend/apps/vendor/src/components/create-product/CategoryPicker.tsx`:

```tsx
"use client"
import { useEffect, useState } from "react"
import { fetchTree } from "@/lib/api/taxonomy"
import type { TreeNode } from "@/lib/types"

interface Props {
  value: string | null
  onChange: (handle: string | null) => void
}

export default function CategoryPicker({ value, onChange }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [section, setSection] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [subcategory, setSubcategory] = useState<string | null>(null)
  const [useSub, setUseSub] = useState(false)

  useEffect(() => { fetchTree().then(setTree) }, [])

  // Restore from value on mount
  useEffect(() => {
    if (!value) return
    const parts = value.split(".")
    setSection(parts[0])
    if (parts.length >= 2) setCategory(parts.slice(0, 2).join("."))
    if (parts.length >= 3) { setSubcategory(value); setUseSub(true) }
  }, [value])

  const sections = tree
  const categories = section ? tree.find((s) => s.handle === section)?.children ?? [] : []
  const subcategories = category ? categories.find((c) => c.handle === category)?.children ?? [] : []

  function commit() {
    if (useSub && subcategory) onChange(subcategory)
    else if (category) onChange(category)
    else onChange(null)
  }
  useEffect(commit, [section, category, subcategory, useSub])

  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${useSub ? "grid-cols-3" : "grid-cols-2"} border border-gray-200 rounded-lg overflow-hidden bg-gray-50`}>
        <Column
          title="Section"
          items={sections}
          activeHandle={section}
          onPick={(h) => { setSection(h); setCategory(null); setSubcategory(null) }}
        />
        <Column
          title="Category"
          items={categories}
          activeHandle={category}
          onPick={(h) => { setCategory(h); setSubcategory(null) }}
        />
        {useSub && (
          <Column
            title="Sub-category"
            items={subcategories}
            activeHandle={subcategory}
            onPick={setSubcategory}
          />
        )}
      </div>

      <label className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={useSub}
          onChange={(e) => { setUseSub(e.target.checked); if (!e.target.checked) setSubcategory(null) }}
          className="accent-teal-700"
        />
        <span>
          <strong className="text-gray-900">Use sub-category for finer tagging</strong>
          <span className="text-gray-500"> — optional. Useful for fashion sizes, electronics models, home variants. Most restaurants leave this off.</span>
        </span>
        <span className="ml-auto text-xs text-gray-500">Advanced</span>
      </label>

      {(category || subcategory) && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
          Selected: <strong>{useSub && subcategory ? prettyPath(subcategory, tree) : prettyPath(category!, tree)}</strong>
        </div>
      )}
    </div>
  )
}

function Column({ title, items, activeHandle, onPick }: { title: string; items: TreeNode[]; activeHandle: string | null; onPick: (h: string) => void }) {
  return (
    <div className="bg-white py-2 max-h-72 overflow-y-auto">
      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 px-3.5 pb-2 border-b border-gray-200 mb-1.5">{title}</div>
      {items.map((it) => {
        const active = it.handle === activeHandle
        return (
          <div
            key={it.handle}
            onClick={() => onPick(it.handle)}
            className={`px-3.5 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${active ? "bg-emerald-50 text-teal-700 font-semibold" : ""}`}
          >
            {it.display_name}
          </div>
        )
      })}
      {items.length === 0 && <div className="px-3.5 text-xs text-gray-400 italic">(empty)</div>}
    </div>
  )
}

function prettyPath(handle: string, tree: TreeNode[]): string {
  const parts = handle.split(".")
  const labels: string[] = []
  let cur = tree
  for (const p of parts) {
    const acc = parts.slice(0, parts.indexOf(p) + 1).join(".")
    const node = flat(tree).find((n) => n.handle === acc)
    if (node) labels.push(node.display_name)
  }
  return labels.join(" → ")
}

function flat(tree: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = []
  function walk(ns: TreeNode[]) { for (const n of ns) { out.push(n); walk(n.children) } }
  walk(tree)
  return out
}
```

- [ ] **Step 3: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/vendor/src/components/create-product/CategoryPicker.tsx \
        backend/apps/vendor/src/lib/
git commit -m "feat(vendor): CategoryPicker — 2-level default with advanced toggle

3rd column appears only when 'Use sub-category' is checked. Selecting a
node cascades the right-side columns. Selected breadcrumb displayed
below. Tree fetched from /store/taxonomy/tree with cache=force-cache.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 9.2: SchemaForm renderer

**Files:**
- Create: `backend/apps/vendor/src/components/create-product/SchemaForm.tsx`

- [ ] **Step 1: Implement**

Create `backend/apps/vendor/src/components/create-product/SchemaForm.tsx`:

```tsx
"use client"
import { useEffect, useState } from "react"
import { fetchLeafSchema } from "@/lib/api/taxonomy"
import type { LeafSchema, FieldDef } from "@/lib/types"

interface Props {
  taxonomyHandle: string
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

export default function SchemaForm({ taxonomyHandle, value, onChange }: Props) {
  const [schema, setSchema] = useState<LeafSchema | null>(null)

  useEffect(() => {
    fetchLeafSchema(taxonomyHandle).then(setSchema)
  }, [taxonomyHandle])

  if (!schema) return <div className="text-sm text-gray-500">Loading schema…</div>

  function set(key: string, v: unknown) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {schema.core_fields.map((f) => (
        <FieldEditor key={f.key} field={f} value={value[f.key]} onChange={(v) => set(f.key, v)} />
      ))}
    </div>
  )
}

function FieldEditor({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const colSpan = field.type === "string[]" ? "col-span-2" : ""
  return (
    <div className={`flex flex-col gap-1.5 ${colSpan}`}>
      <label className="text-sm font-semibold">
        {field.label} {field.required && <span className="text-red-600">*</span>}
      </label>
      {renderInput(field, value, onChange)}
      {field.hint && <span className="text-[11px] text-gray-500">{field.hint}</span>}
    </div>
  )
}

function renderInput(field: FieldDef, value: unknown, onChange: (v: unknown) => void) {
  const cls = "px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
  if (field.type === "string") {
    return <input className={cls} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
  }
  if (field.type === "number") {
    return <input type="number" className={cls} min={field.min} max={field.max}
      value={(value as number) ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
  }
  if (field.type === "boolean") {
    return (
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-teal-700" checked={(value as boolean) ?? false} onChange={(e) => onChange(e.target.checked)} />
        <span>{value ? "Yes" : "No"}</span>
      </label>
    )
  }
  if (field.type === "enum") {
    return (
      <select className={cls} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">Select…</option>
        {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (field.type === "string[]") {
    const arr = (value as string[]) ?? []
    return (
      <ChipsInput value={arr} options={field.options} onChange={onChange as (v: string[]) => void} />
    )
  }
  return null
}

function ChipsInput({ value, options, onChange }: { value: string[]; options?: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("")
  function add(s: string) {
    const v = s.trim()
    if (!v || value.includes(v)) return
    if (options && !options.includes(v)) return
    onChange([...value, v])
    setDraft("")
  }
  function remove(s: string) { onChange(value.filter((x) => x !== s)) }
  return (
    <div className="flex flex-wrap gap-1 border border-gray-200 rounded-lg p-1.5 bg-white">
      {value.map((s) => (
        <span key={s} className="bg-gray-100 px-2 py-0.5 rounded text-[13px] flex items-center gap-1">
          {s}<button onClick={() => remove(s)} className="text-gray-400 text-xs">×</button>
        </span>
      ))}
      {options ? (
        <select className="border-none outline-none text-sm bg-transparent" value="" onChange={(e) => add(e.target.value)}>
          <option value="">Add…</option>
          {options.filter((o) => !value.includes(o)).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          className="border-none outline-none text-sm bg-transparent flex-1 min-w-20"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft) } }}
          placeholder="Type and press Enter"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/vendor/src/components/create-product/SchemaForm.tsx
git commit -m "feat(vendor): SchemaForm — renders fields from leaf schema

Per field type: string/number/boolean/enum/string[]. ChipsInput handles
both free-text tags and enum-restricted multi-pick. Hints rendered
under each field. Required marker is the red asterisk.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 9.3: CustomFieldsEditor + MerchTagger

**Files:**
- Create: `backend/apps/vendor/src/components/create-product/CustomFieldsEditor.tsx`
- Create: `backend/apps/vendor/src/components/create-product/MerchTagger.tsx`

- [ ] **Step 1: CustomFieldsEditor**

```tsx
"use client"
import { useState } from "react"

interface Props {
  value: Record<string, unknown>
  reservedKeys: string[]
  onChange: (next: Record<string, unknown>) => void
}

export default function CustomFieldsEditor({ value, reservedKeys, onChange }: Props) {
  const entries = Object.entries(value ?? {})
  const [draftKey, setDraftKey] = useState("")
  const [draftVal, setDraftVal] = useState("")
  const reserved = new Set(reservedKeys)

  function add() {
    const k = draftKey.trim()
    if (!k) return
    if (reserved.has(k)) { alert(`"${k}" is a core field — pick a different key`); return }
    if (k in value) { alert(`"${k}" already exists`); return }
    onChange({ ...value, [k]: draftVal })
    setDraftKey(""); setDraftVal("")
  }
  function remove(k: string) {
    const next = { ...value }; delete next[k]; onChange(next)
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3.5">
      <h3 className="text-sm font-semibold mb-1">Custom fields (optional)</h3>
      <p className="text-xs text-gray-500 mb-3">No validation. Renders below standard specs on the product page.</p>
      <div className="grid grid-cols-2 gap-3">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold flex justify-between">
              {k}
              <button onClick={() => remove(k)} className="text-red-600 text-xs">remove</button>
            </label>
            <input className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm" value={String(v)} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <input className="flex-1 px-2.5 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Field name (e.g., gluten_free)" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} />
        <input className="flex-1 px-2.5 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Value" value={draftVal} onChange={(e) => setDraftVal(e.target.value)} />
        <button onClick={add} className="px-3 py-2 bg-white border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-teal-600">+ Add</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: MerchTagger**

```tsx
"use client"
import { useEffect, useState } from "react"

interface MerchCat { id: string; name: string }
interface Props {
  tenantId: string
  value: string[]
  onChange: (next: string[]) => void
}

export default function MerchTagger({ tenantId, value, onChange }: Props) {
  const [cats, setCats] = useState<MerchCat[]>([])
  const [newName, setNewName] = useState("")

  useEffect(() => { reload() }, [tenantId])

  async function reload() {
    const r = await fetch(`/api/proxy/admin/tenants/${tenantId}/merch-categories`, { credentials: "include" })
    if (r.ok) setCats((await r.json()).merch_categories)
  }

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  async function createInline() {
    if (!newName.trim()) return
    const r = await fetch(`/api/proxy/admin/tenants/${tenantId}/merch-categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (r.ok) { setNewName(""); reload() }
    else alert(`Failed: ${r.status}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c.id} onClick={() => toggle(c.id)} className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
            value.includes(c.id) ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-600"
          }`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 px-2.5 py-2 border border-gray-200 rounded-lg text-sm" placeholder="+ Create new merch category" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button onClick={createInline} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm">Create</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/vendor/src/components/create-product/CustomFieldsEditor.tsx \
        backend/apps/vendor/src/components/create-product/MerchTagger.tsx
git commit -m "feat(vendor): CustomFieldsEditor + MerchTagger

CustomFieldsEditor: key/value pairs. Rejects collisions with the
schema's reserved keys. MerchTagger: multi-select pills + inline
'create new merch category'. Both hit /api/proxy/admin/...

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 9.4: Wizard host page

**Files:**
- Create: `backend/apps/vendor/src/app/products/new/page.tsx`

- [ ] **Step 1: Wizard page**

Create `backend/apps/vendor/src/app/products/new/page.tsx`:

```tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import CategoryPicker from "@/components/create-product/CategoryPicker"
import SchemaForm from "@/components/create-product/SchemaForm"
import CustomFieldsEditor from "@/components/create-product/CustomFieldsEditor"
import MerchTagger from "@/components/create-product/MerchTagger"

type Step = 1 | 2 | 3 | 4

interface WizardState {
  taxonomyHandle: string | null
  coreFields: Record<string, unknown>
  customFields: Record<string, unknown>
  merchCategoryIds: string[]
  product: { title: string; handle: string; description: string; thumbnail: string }
}

const init: WizardState = {
  taxonomyHandle: null, coreFields: {}, customFields: {}, merchCategoryIds: [],
  product: { title: "", handle: "", description: "", thumbnail: "" },
}

export default function NewProductPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [state, setState] = useState<WizardState>(init)
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") ?? "" : ""

  async function submit() {
    const res = await fetch(`/api/proxy/admin/products`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: state.product.title,
        handle: state.product.handle,
        description: state.product.description,
        thumbnail: state.product.thumbnail,
        status: "published",
      }),
    })
    if (!res.ok) { alert(`Product create failed: ${res.status}`); return }
    const { product } = await res.json()
    // Then assign taxonomy
    const t = await fetch(`/api/proxy/admin/products/${product.id}/taxonomy`, {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ taxonomy_handle: state.taxonomyHandle, core_fields: state.coreFields, custom_fields: state.customFields }),
    })
    if (!t.ok) { alert(`Taxonomy assignment failed`); return }
    // Then attach merch categories
    if (state.merchCategoryIds.length > 0) {
      await fetch(`/api/proxy/admin/products/${product.id}/merch-categories`, {
        method: "PUT", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ merch_category_ids: state.merchCategoryIds }),
      })
    }
    router.push(`/products/${product.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Create product</h1>
      <Stepper step={step} />

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Step 1 — Pick a product category</h2>
          <CategoryPicker value={state.taxonomyHandle} onChange={(h) => setState({ ...state, taxonomyHandle: h })} />
          <Nav onBack={null} onNext={() => state.taxonomyHandle && setStep(2)} nextDisabled={!state.taxonomyHandle} />
        </div>
      )}
      {step === 2 && state.taxonomyHandle && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Step 2 — Fill specs</h2>
          <SchemaForm taxonomyHandle={state.taxonomyHandle} value={state.coreFields} onChange={(v) => setState({ ...state, coreFields: v })} />
          <CustomFieldsEditor value={state.customFields} reservedKeys={Object.keys(state.coreFields)} onChange={(v) => setState({ ...state, customFields: v })} />
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Step 3 — Tag merch categories</h2>
          <MerchTagger tenantId={tenantId} value={state.merchCategoryIds} onChange={(v) => setState({ ...state, merchCategoryIds: v })} />
          <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Step 4 — Standard fields</h2>
          <StandardFields product={state.product} onChange={(p) => setState({ ...state, product: p })} />
          <Nav onBack={() => setStep(3)} onNext={submit} nextLabel="Create product" />
        </div>
      )}
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const items = ["Category", "Specs", "Merch tag", "Standard fields"]
  return (
    <div className="grid grid-cols-4 gap-1 bg-gray-100 rounded-lg p-2">
      {items.map((label, i) => {
        const idx = (i + 1) as Step
        const done = idx < step
        const active = idx === step
        return (
          <div key={label} className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            active ? "bg-white shadow-sm text-gray-900" : done ? "text-gray-900" : "text-gray-400"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              done ? "bg-teal-700 text-white" : active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"
            }`}>{done ? "✓" : idx}</span>
            {idx}. {label}
          </div>
        )
      })}
    </div>
  )
}

function Nav({ onBack, onNext, nextDisabled, nextLabel }: { onBack: (() => void) | null; onNext: () => void; nextDisabled?: boolean; nextLabel?: string }) {
  return (
    <div className="flex justify-between pt-4">
      {onBack ? <button onClick={onBack} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold">‹ Back</button> : <span />}
      <button onClick={onNext} disabled={nextDisabled} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{nextLabel ?? "Continue ›"}</button>
    </div>
  )
}

function StandardFields({ product, onChange }: { product: any; onChange: (p: any) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold">Title</label><input className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm" value={product.title} onChange={(e) => onChange({ ...product, title: e.target.value })} /></div>
      <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold">Handle</label><input className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm" value={product.handle} onChange={(e) => onChange({ ...product, handle: e.target.value })} /></div>
      <div className="flex flex-col gap-1.5 col-span-2"><label className="text-sm font-semibold">Description</label><textarea rows={4} className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm" value={product.description} onChange={(e) => onChange({ ...product, description: e.target.value })} /></div>
      <div className="flex flex-col gap-1.5 col-span-2"><label className="text-sm font-semibold">Thumbnail URL</label><input className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm" value={product.thumbnail} onChange={(e) => onChange({ ...product, thumbnail: e.target.value })} /></div>
    </div>
  )
}
```

- [ ] **Step 2: Manual smoke test**

```bash
cd backend/apps/vendor
npm run dev
```

Open `http://localhost:9100/products/new`. Walk through all 4 steps with a real test shop:
1. Step 1: pick Food → Pizza. Click Continue. Verify selected breadcrumb.
2. Toggle "Use sub-category" on, then off. Verify column appears/disappears.
3. Step 2: form renders pizza fields. Fill them. Add a custom field.
4. Step 3: create a new merch category inline. Tag it.
5. Step 4: enter title/handle/description. Click "Create product".
6. Verify the product appears in the product list with the right metadata.

- [ ] **Step 3: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/vendor/src/app/products/new/
git commit -m "feat(vendor): 4-step create-product wizard

Step 1: CategoryPicker (2-level default + advanced sub-category toggle).
Step 2: SchemaForm + CustomFieldsEditor.
Step 3: MerchTagger.
Step 4: Standard product fields.
Submit POSTs the product, then /taxonomy, then /merch-categories.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

## Phase 10 — Seed rewrite + vertical-fields cleanup

### Task 10.1: Rewrite seed-demo-shops.ts

**Files:**
- Modify: `backend/apps/backend/src/scripts/seed-demo-shops.ts`

- [ ] **Step 1: Rewrite the seed**

Replace the entire contents of `backend/apps/backend/src/scripts/seed-demo-shops.ts` with the new taxonomy-aware version. Key changes from the current script:
- For each product, set `taxonomy_handle` (e.g., `"food.pizza"`)
- For each product, set `core_fields` matching that handle's schema
- For each shop, define a list of merch categories (e.g., `["Pizzas", "Burgers", ...]`) and attach products to them via the new merch module
- Remove all `vertical_fields` references — call `assignProductToTaxonomyWorkflow` instead

The full structure (truncated example for the first shop):

```typescript
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createSalesChannelsWorkflow, createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { assignProductToTaxonomyWorkflow } from "../workflows/assign-product-to-taxonomy"
import { TENANT_MODULE } from "../modules/tenant"
import { MERCH_MODULE } from "../modules/merch"

interface ProductSeed {
  handle: string
  title: string
  description: string
  thumbnail: string
  images: string[]
  price_minor: number
  taxonomy_handle: string
  core_fields: Record<string, unknown>
  custom_fields?: Record<string, unknown>
  merch_category_handle: string
}

interface MerchSeed { handle: string; name: string; position: number }

interface ShopSeed {
  slug: string
  name: string
  vertical: "food" | "grocery" | "home" | "fashion" | "electronics" | "general"
  display_currency: "IQD" | "USD"
  branding: { logo_url: string; primary_color: string }
  merch_categories: MerchSeed[]
  products: ProductSeed[]
}

const SHOPS: ShopSeed[] = [
  {
    slug: "hamzas-kitchen",
    name: "Hamza's Kitchen",
    vertical: "food",
    display_currency: "IQD",
    branding: { logo_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200", primary_color: "#DC2626" },
    merch_categories: [
      { handle: "pizzas",   name: "Pizzas",   position: 1 },
      { handle: "burgers",  name: "Burgers",  position: 2 },
      { handle: "salads",   name: "Salads",   position: 3 },
      { handle: "pasta",    name: "Pasta",    position: 4 },
      { handle: "desserts", name: "Desserts", position: 5 },
      { handle: "drinks",   name: "Drinks",   position: 6 },
    ],
    products: [
      {
        handle: "hk-margherita",
        title: "Margherita Pizza",
        description: "Wood-fired pizza with basil, mozzarella, San Marzano tomatoes.",
        thumbnail: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
        images: [
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
          "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",
          "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600",
          "https://images.unsplash.com/photo-1601925268573-ad5e2b1d63a8?w=600",
        ],
        price_minor: 15000,
        taxonomy_handle: "food.pizza",
        core_fields: { size_in: "12", prep_min: 18, toppings: ["basil", "mozzarella", "tomato"], allergens: ["gluten", "dairy"], is_vegan: false },
        custom_fields: { gluten_free: false },
        merch_category_handle: "pizzas",
      },
      // ... 5 more food items, each with taxonomy_handle "food.burger" / "food.salad" / etc.
    ],
  },
  // ... 4 more shops following the same shape
]

export default async function seedDemoShops({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const tenantSvc = container.resolve(TENANT_MODULE) as any
  const merchSvc = container.resolve(MERCH_MODULE) as any
  const productSvc = container.resolve("product") as any

  logger.info(`Seeding ${SHOPS.length} demo shops with taxonomy...`)

  for (const shop of SHOPS) {
    // 1. Sales channel (find existing, create if not)
    const existingChannel = (await productSvc.listSalesChannels({ name: shop.name }))[0]
    let channel = existingChannel
    if (!channel) {
      const { result: [c] } = await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData: [{ name: shop.name, description: `Sales channel for ${shop.name}` }] },
      })
      channel = c
    }

    // 2. Tenant upsert
    const existing = await tenantSvc.getBySlug(shop.slug)
    const tenantPayload = {
      slug: shop.slug,
      name: shop.name,
      vertical: shop.vertical,
      display_currency: shop.display_currency,
      show_secondary: true,
      sales_channel_id: channel.id,
      branding: shop.branding,
      approval_status: "approved",
    }
    let tenant
    if (existing) {
      tenant = await tenantSvc.updateTenants(existing.id, tenantPayload)
    } else {
      tenant = await tenantSvc.createTenants(tenantPayload)
    }

    // 3. Merch categories upsert
    const merchByHandle: Record<string, any> = {}
    for (const m of shop.merch_categories) {
      const found = await merchSvc.getByHandleForTenant(tenant.id, m.handle)
      merchByHandle[m.handle] = found ?? await merchSvc.createForTenant(tenant.id, m)
    }

    // 4. Remove any existing demo products for this shop's sales channel (by handle prefix)
    const existingProducts = await productSvc.listProducts({ handle: shop.products.map((p) => p.handle) })
    if (existingProducts.length > 0) {
      await productSvc.deleteProducts(existingProducts.map((p: any) => p.id))
    }

    // 5. Create products + assign taxonomy + tag merch
    for (const ps of shop.products) {
      const { result: [created] } = await createProductsWorkflow(container).run({
        input: {
          products: [{
            handle: ps.handle,
            title: ps.title,
            description: ps.description,
            thumbnail: ps.thumbnail,
            status: "published",
            sales_channels: [{ id: channel.id }],
            images: ps.images.map((url) => ({ url })),
            options: [{ title: "Default", values: ["Default"] }],
            variants: [{
              title: "Default",
              manage_inventory: false,
              prices: [{ amount: ps.price_minor, currency_code: shop.display_currency.toLowerCase() }],
              options: { Default: "Default" },
            }],
          }],
        },
      })

      await assignProductToTaxonomyWorkflow(container).run({
        input: {
          product_id: created.id,
          taxonomy_handle: ps.taxonomy_handle,
          core_fields: ps.core_fields,
          custom_fields: ps.custom_fields,
        },
      })

      // Tag into merch (use the product service to add the category)
      const merch = merchByHandle[ps.merch_category_handle]
      if (merch) {
        await productSvc.updateProducts(created.id, {
          category_ids: [
            ...((await productSvc.retrieveProduct(created.id, { relations: ["categories"] })).categories ?? []).map((c: any) => c.id),
            merch.id,
          ],
        })
      }
    }

    logger.info(`✓ ${shop.name}: ${shop.products.length} products`)
  }

  logger.info(`Demo shops seeded. Total products: ${SHOPS.reduce((n, s) => n + s.products.length, 0)}`)
}
```

The full SHOPS array follows the same pattern. Use these taxonomy_handle mappings for the 5 shops' products:

| Shop | Products & taxonomy_handle |
|---|---|
| Hamza's Kitchen | margherita → `food.pizza`, burger → `food.burger`, salad → `food.salad`, pasta → `food.pasta`, dessert → `food.dessert`, drink → `food.drink` |
| FreshMart | rice → `grocery.rice`, milk → `grocery.dairy`, eggs → `grocery.eggs`, fruit → `grocery.fruit`, vegetable → `grocery.vegetable`, oil → `grocery.oil`, bread → `grocery.bakery`, snacks → `grocery.snack` |
| Style Hub | tee → `fashion.shirt`, jeans → `fashion.pants`, jacket → `fashion.jacket`, dress → `fashion.dress`, shoes → `fashion.shoes`, accessory → `fashion.accessory` |
| TechPoint | headphones → `electronics.headphones`, charger → `electronics.charging`, smartwatch → `electronics.smartwatch`, power bank → `electronics.power-bank`, earbuds → `electronics.earbuds` |
| Bayti | cookware → `home.cookware`, towels → `home.bath-textiles`, bedding → `home.bedding`, cleaning → `home.cleaning`, candle → `home.decor`, kettle → `home.appliance`, frames → `home.frames` |

Each product's `core_fields` must match the corresponding leaf schema's required fields (refer to `src/taxonomy/schemas/*.ts`).

- [ ] **Step 2: Commit the rewrite**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/scripts/seed-demo-shops.ts
git commit -m "feat(seed): rewrite seed-demo-shops for new taxonomy model

Each product picks a taxonomy_handle and fills schema-matching
core_fields. Products tag into per-shop merch_category. No more
vertical_fields module calls — this seed becomes the canonical source
of demo data for SP-A.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 10.2: Run seed + verify success criteria

- [ ] **Step 1: Wipe demo data and reseed**

```bash
cd backend/apps/backend
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db \
  -c "UPDATE product SET deleted_at = now() WHERE handle LIKE 'hk-%' OR handle LIKE 'fm-%' OR handle LIKE 'sh-%' OR handle LIKE 'tp-%' OR handle LIKE 'by-%';"
npx medusa exec ./src/scripts/seed-demo-shops.ts 2>&1 | tail -15
```
Expected output:
```
✓ Hamza's Kitchen: 6 products
✓ FreshMart: 8 products
✓ Style Hub: 6 products
✓ TechPoint: 5 products
✓ Bayti — Home & Household: 7 products
Demo shops seeded. Total products: 32
```

- [ ] **Step 2: Verify Success Criterion 3 — pizza shows correct fields**

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db -c "SELECT metadata FROM product WHERE handle = 'hk-margherita';"
```
Expected: `core_fields` JSON includes `size_in`, `prep_min`, `toppings`, `allergens`.

- [ ] **Step 3: Verify Success Criterion 4 — t-shirt has size/material/fit fields**

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db -c "SELECT metadata FROM product WHERE handle = 'sh-tshirt';"
```
Expected: `core_fields.size`, `core_fields.material`, `core_fields.fit`.

- [ ] **Step 4: Verify Success Criterion 5 — smartwatch has brand/case_size/band**

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db -c "SELECT metadata FROM product WHERE handle = 'tp-smartwatch';"
```
Expected: `core_fields.brand`, `core_fields.case_size_mm`, `core_fields.band_material`.

- [ ] **Step 5: Verify Success Criterion 7 — cross-shop pizza search**

```bash
curl -s -H "x-publishable-api-key: $PUB_KEY" "http://localhost:9000/store/products/search?q=pizza" | head -200
```
Expected: returns hk-margherita.

- [ ] **Step 6: Storefront browser smoke**

Visit `http://localhost:8000/iq/products/hk-margherita`. Verify the DetailsPanel renders below the description with Size, Toppings, Allergens. Visit `/iq/products/sh-tshirt` — verify it renders with Size, Material, Fit fields (different from pizza). **This is the multi-industry coherence test — same component, different content.**

- [ ] **Step 7: Mobile smoke (Expo Go)**

```bash
cd mobile
npx expo start --clear
```
Open one product per shop on the device. Verify DetailsPanel renders correctly for each.

- [ ] **Step 8: Commit (no code change — verification log only)**

If any verification fails: stop, debug, fix, re-run from Step 1. If everything passes:

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
echo "SP-A success criteria verified on $(date +%Y-%m-%d)" >> docs/superpowers/specs/sp-a-verification.log
git add docs/superpowers/specs/sp-a-verification.log
git commit -m "test(sp-a): success criteria verified — 5 shops, 32 products, all schemas render

Manual smoke verified: pizza shows size/toppings/allergens, t-shirt
shows size/material/fit, smartwatch shows brand/case/band. Storefront
and mobile both render via the same DetailsPanel component.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

### Task 10.3: Delete vertical-fields module

**Files:**
- Delete: `backend/apps/backend/src/modules/vertical-fields/` (entire directory)
- Modify: `backend/apps/backend/medusa-config.ts` (remove the resolve line)

- [ ] **Step 1: Find all references**

Run: `cd backend/apps/backend && grep -rE "vertical[-_]fields|VERTICAL_FIELDS|VerticalFieldsService" src/ --include="*.ts" -l`

Expected: should only list files INSIDE `src/modules/vertical-fields/` (about to be deleted) — no other references anywhere. If anything else lights up, fix or remove those references first.

- [ ] **Step 2: Generate drop-table migration**

```bash
cd backend/apps/backend
# Remove the module from medusa-config first
```
In `backend/apps/backend/medusa-config.ts`, delete the line `{ resolve: "./src/modules/vertical-fields" }`.

```bash
npx medusa db:generate --dry-run 2>&1 | head -20
```
If Medusa cannot auto-generate a drop migration for a removed module, fall back to writing one manually:

Create `backend/apps/backend/src/modules/tenant/migrations/Migration<timestamp>_drop_vertical_fields.ts`:

```typescript
import { Migration } from "@mikro-orm/migrations"

export class MigrationDropVerticalFields extends Migration {
  async up(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "vertical_product_fields" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "vertical_product_field_template" CASCADE;`)
  }
  async down(): Promise<void> {
    // No-op — bringing this back requires the original migration which has been deleted.
  }
}
```

Place the file in `src/modules/tenant/migrations/` so it travels with the tenant module's migration history.

- [ ] **Step 3: Run the migration**

```bash
npx medusa db:migrate
```
Expected: "Migration scripts completed". The `vertical_product_fields` and `vertical_product_field_template` tables are gone.

- [ ] **Step 4: Delete the module directory**

```bash
rm -rf backend/apps/backend/src/modules/vertical-fields/
```

- [ ] **Step 5: Verify cleanly**

```bash
cd backend/apps/backend
grep -rE "vertical[-_]fields|VERTICAL_FIELDS|VerticalFieldsService" src/ --include="*.ts" 2>&1 || echo "✓ clean"
```
Expected: `✓ clean`.

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db -c "\dt vertical_*"
```
Expected: "Did not find any relation named ..." or empty result.

- [ ] **Step 6: Restart server + full test run**

```bash
cd backend/apps/backend
npm run dev
# Wait for boot logs, ctrl-C
npm run test:unit
npm run test:integration:modules
npm run test:integration:http
```
All tests must PASS.

- [ ] **Step 7: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add -A
git commit -m "chore(taxonomy): delete vertical-fields module — taxonomy is the canonical model

Removed src/modules/vertical-fields/ entirely. Dropped underlying tables
via a Migration in src/modules/tenant/migrations/. No backward-compat
shim — the taxonomy registry is now the only metadata source.

Co-Authored-By: Claude Opus 4.7 (1M-context) <noreply@anthropic.com>"
```

---

## Final checklist before declaring SP-A done

- [ ] All Phase 1-10 commits are on local `main`.
- [ ] `grep -r vertical_fields` in the repo returns nothing.
- [ ] All test suites pass: `npm run test:unit && npm run test:integration:modules && npm run test:integration:http`.
- [ ] Seed runs clean twice in a row (idempotency).
- [ ] Spec success criteria 1-9 all verified (see Task 10.2 log).
- [ ] Mobile + storefront product pages show the right fields for each section.
- [ ] Vendor wizard end-to-end works for at least one product creation in each of the 5 sections.
- [ ] No remaining references to "Specs" — labels say "Details" everywhere.

After all of the above: push to remote.

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git push origin main
```

Then dispatch the final cross-cutting review with the code-review pattern before declaring SP-A complete.
