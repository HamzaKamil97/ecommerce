# SP-A: Catalog + Product-Category Model — Design Spec

**Status:** Draft, awaiting user review
**Date:** 2026-05-18
**Parent milestone:** First-customer launch v0 (replaces investor-demo framing — see `memory/project_target_audience_first_customers.md`)
**Position in roadmap:** Sub-project A of 7. Foundational; B/F/G all depend on it.

---

## Goal

Replace the flat `vertical-fields` module with a proper **3-level platform-curated taxonomy** (Section → Category → Sub-category) where each sub-category carries a code-defined schema of core fields. Layer per-shop **merch categories** on top for customer-facing browse. Customer browses shops-first; taxonomy is internal but powers search, the future AI agent, and the product detail specs panel.

## Why this exists

User feedback 2026-05-18 (item 7): "metadata of the items not showed clear, i prefer to have categories for products and then the store can use the product category, and based on product category then there will be data input, for example data category of clothes is different than the food."

Current state: `vertical-fields` module has a flat ~6-vertical list (food/fashion/electronics/grocery/home/general) with a single schema per vertical. Too coarse — a pizza wants different fields than a salad even though both are "food". The customer also has no way to navigate by what they want vs. which shop has it (item 6), and the metadata that does exist isn't well-surfaced (item 2).

## Architecture overview

Platform maintains a 3-level tree in Medusa's existing `product_category` table (handles dot-namespaced: `food`, `food.pizza`, `food.pizza.margherita-style`). Schemas can attach at **either Category or Sub-category** level — the product stores whichever taxonomy node the vendor stops at.

**Sub-category is optional and advanced** (revised after user feedback 2026-05-18). Most vendors — especially restaurants and grocery — only need Section → Category (e.g., `food.pizza` is enough). Industries where finer tagging matters — fashion, electronics, home — can opt-in to Sub-category via a toggle in the create-product wizard. Vendors can NEVER add taxonomy nodes; only the platform team can. This keeps the tree clean.

When a vendor creates a product, they pick the deepest node they want. The schema for that node renders as a form. Core fields are validated at the workflow layer and stored in `product.metadata.core_fields`. Shops may add arbitrary key-value pairs in `product.metadata.custom_fields` (no platform validation).

Separately, each shop curates **merch categories** (flat per-shop browse buckets: "Pizzas", "Burgers"). These live in a new `merch` module with two tables: `merch_category` and `product_merch_category` join. A product can be in 0..N merch categories within its own tenant.

Customer-facing flow stays shops-first: home shows shops, tap shop → see products grouped by merch categories, tap product → detail page renders the schema's core fields as a specs panel followed by any custom fields. **Customer never sees the taxonomy path** — no `food · pizza · margherita-style` breadcrumb anywhere. Taxonomy only surfaces as filter chips ("Category: Pizza", "Fast delivery", "Under 20,000 IQD") on the search/browse page.

**Multi-industry UI coherence rule:** The same `ProductCard`, `DetailsPanel`, `ShopCard`, `CartItemRow`, and search-row components render for all sections. Only the schema-driven content (fields, labels, values) adapts. No `if (section === "food") { ... }` branches in components. See `memory/feedback_multi_industry_coherence.md`.

## Data model

### Taxonomy (reuses Medusa `product_category` — no new table)

| Field | Convention |
|---|---|
| `handle` | Dot-namespaced slug: `food`, `food.pizza`, `food.pizza.margherita-style` |
| `parent_category_id` | Builds the 3-level tree |
| `is_internal` | `true` for taxonomy nodes (hides them from accidental merch use) |
| `metadata.is_taxonomy` | `true` — distinguishes taxonomy from any future platform-level merch |
| `metadata.schema_handle` | On leaves only; matches a TS file in `src/taxonomy/schemas/<handle>.ts` |

Seeded once at boot from `src/taxonomy/seed.ts`. Idempotent upsert by handle.

Initial scope (v0): ~5 sections, ~25 categories, ~75 sub-categories covering food / grocery / home / fashion / electronics. Full leaf list lives in the seed file.

### `merch_category` — per-shop browse buckets (NEW)

```
merch_category
─────────────────────────────
id            text  pk
tenant_id     text  fk tenant.id, indexed
handle        text  unique within tenant
name          text
position      int
icon_url      text  nullable
created_at, updated_at, deleted_at
```

```
product_merch_category
─────────────────────────────
product_id        text  fk product.id
merch_category_id text  fk merch_category.id
position          int
PK (product_id, merch_category_id)
```

**Flat-only for v0** — no nesting. Shops can rename / reorder but not nest sub-buckets. Add nesting in v1 if shops ask for it.

New module at `src/modules/merch/` with `MerchService` exposing:
- `listForTenant(tenantId): MerchCategory[]`
- `createForTenant(tenantId, data): MerchCategory`
- `updateMerchCategory(id, data): MerchCategory`
- `softDelete(id): void`
- `addProductToMerch(productId, merchCatId, position?): void`
- `listProductsInMerch(merchCatId, opts?): Product[]`
- `listMerchForProduct(productId): MerchCategory[]`

### `product.metadata` — JSONB conventions (no schema change)

```json
{
  "core_fields":   { "prep_min": 18, "size_in": "12", "toppings": ["basil","tomato"] },
  "custom_fields": { "gluten_free": true, "house_special": false }
}
```

Plus the existing `product.categories` link (Medusa built-in) attaches the product to **exactly one taxonomy leaf** plus zero-or-more merch categories. The "exactly one taxonomy leaf" rule is enforced in `assignProductToTaxonomyWorkflow`.

### Tenant model adjustment

`tenant.vertical` CHECK constraint changes:
- Drops: `vegetables`, `flowers` (no current shop uses)
- Adds: `grocery`, `home` (matches current seed shops)
- Final: `['food', 'grocery', 'home', 'fashion', 'electronics', 'general']`

Vertical becomes advisory (the shop's primary section). Products are no longer constrained by their tenant's vertical — a corner shop can sell food and home items. Matches real Iraqi shop reality.

## Schema registry pattern

Each leaf has a TypeScript module at `src/taxonomy/schemas/<handle>.ts`:

```typescript
import { LeafSchema } from "../types"

export const schema: LeafSchema = {
  handle: "food.pizza.margherita-style",
  display_name: "Margherita-style Pizza",
  parent: "food.pizza",
  core_fields: [
    { key: "prep_min",  label: "Prep time (min)", type: "number",   required: true, min: 1 },
    { key: "size_in",   label: "Size (inches)",   type: "enum",     required: true, options: ["8","10","12","14","16"] },
    { key: "toppings",  label: "Toppings",        type: "string[]", required: false },
    { key: "allergens", label: "Allergens",       type: "string[]", required: false, options: ["gluten","dairy","egg","nuts"] },
  ],
}
```

Registry at `src/taxonomy/registry.ts` glob-imports all `schemas/*.ts` files at boot and exposes:

- `getSchemaByHandle(handle: string): LeafSchema | null`
- `listAllSchemas(): LeafSchema[]`
- `listSectionLeaves(sectionHandle: string): LeafSchema[]`
- `validateCoreFields(handle, fields): { ok: true } | { ok: false, errors: ValidationError[] }`

Field types supported in v0: `string`, `number`, `boolean`, `enum` (with `options`), `string[]` (with optional `options` for tag-style picker). No file/image custom fields v0.

The `LeafSchema` and `FieldDef` types are exported from a shared location so storefront / vendor / mobile reuse them via either a small shared npm-workspace package or via a thin `/store/taxonomy/leaves/:handle` API response. **Decision: API-driven for v0** — keeps the type contract simple and the clients dumb.

## API surface

All new endpoints:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/store/taxonomy/tree` | none | Full 3-level tree — cached (5 min) |
| GET | `/store/taxonomy/leaves/:handle` | none | One leaf's schema — for client form rendering |
| GET | `/store/tenants/:slug/merch-categories` | publishable key | A shop's merch categories with product counts |
| GET | `/admin/tenants/:tenantId/merch-categories` | vendor or super-admin | Manage shop's merch categories |
| POST | `/admin/tenants/:tenantId/merch-categories` | " | Create a new merch category |
| PATCH | `/admin/tenants/:tenantId/merch-categories/:id` | " | Rename / re-order / change icon |
| DELETE | `/admin/tenants/:tenantId/merch-categories/:id` | " | Soft-delete (products keep their core data, just lose this tag) |
| POST | `/admin/products/:productId/taxonomy` | vendor or super-admin | Set / change the product's taxonomy leaf (re-validates core_fields) |
| PUT | `/admin/products/:productId/merch-categories` | " | Replace the full set of merch categories for this product (idempotent) |

Existing Medusa product endpoints (`/admin/products`, `/store/products`) remain. We just hook into them via workflows.

**Tenant isolation:** every `/admin/*` route resolves the calling vendor's tenant from the auth context. A vendor can only touch products/merch-categories belonging to their own tenant. Super-admin role bypasses this check. 403 on cross-tenant attempts.

## Workflows

- **`assignProductToTaxonomyWorkflow`** (`input: { product_id, taxonomy_handle, core_fields, custom_fields? }`)
  Resolves the leaf, runs `validateCoreFields`. On success: writes `product.metadata.core_fields` + `.custom_fields`, attaches the product to the taxonomy `product_category`. On validation failure: throws structured error with per-field reasons.
- **`createProductWithTaxonomyWorkflow`** (`input: { tenant_id, taxonomy_handle, core_fields, merch_category_ids?, ...standardProduct }`)
  Convenience: wraps `createProductsWorkflow` + `assignProductToTaxonomyWorkflow` + merch attachment. One round-trip from the vendor portal.
- **`syncTaxonomySeedWorkflow`** (no input)
  Reads `src/taxonomy/seed.ts`, upserts the `product_category` tree. Idempotent. Runs on app boot via a subscriber.

Validation rules enforced:
1. Exactly one taxonomy leaf per product.
2. All schema `required: true` fields present, of the correct type.
3. Enum field values must be in the `options` array.
4. `core_fields` keys must all be declared in schema. Unknown keys are rejected (not silently dropped — they likely indicate a typo).
5. `custom_fields` keys cannot collide with `core_fields` keys for the same product.
6. Merch categories attached to a product must all belong to the same tenant as the product's sales channel.

## UI implications

### Shop admin (vendor portal — `backend/apps/vendor/`)

New "Create product" wizard (4 steps):

1. **Pick category** (revised — 2 levels by default):
   - Default UI: 2-column cascade (Section → Category) with type-ahead search.
   - Toggle: "Use sub-category for finer tagging (optional)". When on, a 3rd column appears. Vendor can leave it un-toggled and stop at Category — most restaurants and grocery shops will. Fashion / electronics / home shops will more often enable it.
   - Recently-used categories pinned at top for the shop.
2. **Fill schema**: form rendered from the chosen node's `core_fields` (Category if sub-category toggle off, Sub-category if on). Required fields gated. "+ Add custom field" button below for free-form key/value extras.
3. **Tag merch categories**: multi-select of the shop's merch categories. "+ Create new merch category" inline (modal). 0 selections allowed — product lives under "Uncategorized" in the customer view if so.
4. **Standard product fields**: title, description, images, variants, prices (existing Medusa UI patterns).

Editing an existing product: same wizard, pre-filled. Changing the taxonomy node re-validates `core_fields` against the new schema and warns about fields that no longer apply.

### Mobile (customer — `mobile/`)

**Visibility rule:** customer never sees the taxonomy path. No `food · pizza · margherita-style` breadcrumb. No `prep_min` rendered on product cards or product detail (prep_min stays as backend-only data for cart ETA estimation).

- **Home (unchanged structurally)**: shops list. Per-shop delivery estimate from SP-F. Cart-per-store comes in SP-B.
- **Shop page**: products grouped by the shop's merch categories. Each merch category renders as a horizontal scroll row (Toters-style) or a section header + grid depending on product count. Product cards show only: image, title, price, add (+) button. No time, no leaf path.
- **Product detail page**:
  - Image carousel
  - Title + shop badge
  - PriceText dual-currency (from Phase 3.3)
  - Description
  - **Details panel** (NEW): renders `core_fields` as label:value rows using the schema's `label` + value formatted by type. Header says just "Specs" — no taxonomy path shown. Below that, `custom_fields` rendered as plain key/value rows.
  - Add-to-cart (animation in SP-B)
- **Search** (v0): query input + filter chips. Filters available:
  - Section (dropdown: Food / Fashion / Electronics / Home / Grocery)
  - Category (dropdown, scoped to selected Section if any)
  - Fast delivery (toggle — only shops with ≤30 min delivery)
  - Price range
  - Sort (Best / Cheapest / Fastest)

  Cross-shop results. Each result shows image, title, shop name, shop delivery time, price, quick-add. No taxonomy path on results.

### Storefront (web — `backend/apps/storefront/`)

Mirror of mobile: shop page, product detail with specs panel, basic search. Reuses the same `/store/taxonomy/*` endpoints.

## Migration / seed strategy

1. Generate Medusa migration: drop `vertical_product_fields` + `vertical_product_field_template` tables. Delete `src/modules/vertical-fields/`.
2. Generate Medusa migration: create `merch_category` + `product_merch_category`.
3. Generate Medusa migration: alter `tenant.vertical` CHECK constraint to new value set.
4. Create `src/taxonomy/seed.ts` with the full ~5-section / ~25-category / ~75-sub-category tree (handles + display names).
5. Create all leaf schemas as `src/taxonomy/schemas/<handle>.ts`.
6. Create boot subscriber that calls `syncTaxonomySeedWorkflow` on app start.
7. **Rewrite** `src/scripts/seed-demo-shops.ts`: each of the 32 demo products picks a taxonomy leaf, fills core_fields per its schema, and tags into shop merch categories. Re-running wipes + re-seeds (current behavior preserved).
8. Update storefront pages that previously read `vertical_product_fields`: switch to reading `product.metadata.core_fields` + the `/store/taxonomy/leaves/:handle` schema for labels.
9. Update mobile product detail screen similarly.
10. Delete `vertical-fields` module entirely. No backward-compat shim.

After step 10: `grep -r vertical_fields` in the repo returns nothing.

## Revisions after mockup review (2026-05-18)

User reviewed the visual mockups and gave 6 directional changes. Each is now baked into the spec above:

1. **No per-item time on customer UI.** `prep_min` stays as backend-only data for ETA computation. Product cards show no time.
2. **No taxonomy path visible to customer.** Removed the leaf breadcrumb from specs panel and search results.
3. **Sub-category is optional/advanced.** Default vendor flow uses 2 levels (Section → Category). Sub-category column unlocked by a toggle. Data model keeps 3 levels.
4. **Schema flexibility bounded by structure.** Same `DetailsPanel` renders all sections; field TYPES drive variance, not custom components per industry.
5. **Customer filters added.** Section, Category, Fast delivery, Price range, Sort. Listed under "Mobile (customer) — Search".
6. **Multi-industry coherence rule** added to Architecture overview. See `memory/feedback_multi_industry_coherence.md`.

## Out of scope (explicit)

- Cart per-store, fly-to-cart animation → SP-B
- Shop prep time + order tracking → SP-F
- Scrolls feed / Butler / AI shopping agent → SP-G (taxonomy unlocks these; we don't build them here)
- Account / saved locations → SP-D
- Arabic language switcher → SP-E
- Responsive layout polish → SP-C (woven through later sub-projects)
- **Super-admin UI for editing the taxonomy itself** — code-defined for v0. Shops can't add new leaves, only pick existing ones.
- **Image / file types in custom fields** — text-only for v0.
- **Multi-leaf products** — explicitly unsupported. One product, one leaf.
- **Per-leaf "approved by" workflow** — taxonomy is curated, period.
- **Schema inheritance** (e.g., all `food.*` leaves share `prep_min`) — leaves repeat their fields explicitly. Slightly more verbose but no inheritance bugs. Revisit if the registry grows past ~150 leaves.

## Testing approach (per item 14 — test, don't claim)

1. **Schema registry unit tests** (`src/taxonomy/__tests__/registry.test.ts`):
   - All schemas have unique handles
   - Every non-root leaf has a valid parent
   - No duplicate `key` within a single schema's `core_fields`
   - Every leaf referenced by `seed.ts` has a corresponding schema file (and vice versa)
2. **Validation tests**:
   - Happy path: a fully-filled set of core_fields validates clean
   - Missing required field rejected
   - Wrong type rejected (string where number expected, etc.)
   - Enum value not in options rejected
   - Unknown key in core_fields rejected
   - `custom_fields` key collision with `core_fields` rejected
3. **Workflow tests** (with a real test DB):
   - `assignProductToTaxonomyWorkflow` happy path
   - Same workflow with each rejection path
   - `createProductWithTaxonomyWorkflow` end-to-end
4. **API contract tests** (hit each endpoint locally, assert response shape + status):
   - Known-good and known-bad inputs for each new endpoint
   - Tenant-isolation tests (one shop's vendor cannot manage another shop's merch categories)
5. **Seed re-run test**:
   - Wipe DB, run `seed-demo-shops.ts` twice. Row counts identical after each run. No duplicate handles.
6. **Storefront smoke (manual)**:
   - Open shop page, see merch categories. Tap product, see specs panel with core fields rendered.
7. **Mobile smoke (Expo Go, manual)**:
   - One product per shop tested. Specs panel shows the right fields.
8. **Cross-shop search smoke (manual)**:
   - Search "pizza" in storefront. Get results from all shops that have `food.pizza.*` leaves.

Every "task complete" gate in the implementation plan requires at least one of these verifications to have been **run, not assumed**.

## Effort estimate

- Schema registry + leaf files + types: **~2 days**
- `merch` module (tables + service + workflows): **~1.5 days**
- New API routes: **~1 day**
- Tenant enum migration + cleanup: **~0.5 day**
- Vendor portal product wizard rebuild: **~2 days**
- Mobile / storefront product detail specs panel + shop merch grouping: **~2 days**
- Search basic (query + section filter): **~1 day**
- Seed rewrite + taxonomy seed: **~1.5 days**
- Tests (all categories): **~2 days**
- Deleting `vertical-fields` + cleanup: **~0.5 day**

**Total: ~14 working days (~3 weeks calendar at sustainable pace).**

## Success criteria

1. `grep -r vertical_fields` in repo returns nothing.
2. 5 demo shops re-seed with new model in under 60s.
3. Pizza product in Hamza's Kitchen shows `prep_min`, `size_in`, `toppings` in mobile detail.
4. T-shirt in Style Hub shows `size`, `material`, `fit`.
5. Smartwatch in TechPoint shows `brand`, `screen_in`, `band`.
6. Vendor portal "create product" wizard works end-to-end for all 5 sections.
7. Search "pizza" returns all pizza products across all shops that have any.
8. All test categories pass; no skipped tests claimed as "covered manually."
9. A new shop admin can create a product they've never made before by picking a leaf and filling the form, with no documentation read.

## Open questions / decisions deferred during brainstorm

- **Super-admin UI for editing taxonomy** — deferred. Code-defined for v0.
- **Schema inheritance** — deferred. Flat schemas per leaf for v0.
- **Multi-leaf products** — explicitly NO.
- **Image custom fields** — deferred.

User can override any of these on review.
