# Phase H-3.2d Pass 2 — Build the missing endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the manager Catalog, Add-Product, Tags, and PIN-reset surfaces fully functional by building the four backend endpoints they need and re-pointing the PoS api clients to them — then verify each live in the running app.

**Architecture:** Four independent slices. Products list + create share a new manager-scoped path `/admin/catalog/manager-products` (the form is merch-bucket + rich-retail oriented; `/admin/products` is a Medusa **core** route and `/admin/catalog/products` is schema/`category_handle` oriented — neither fits). Tags get a dedicated `pos_tag` module + `/admin/tags` CRUD. PIN-reset gets one service method + one route under the existing `pos_terminal` surface. Every endpoint reuses existing patterns (catalog-snapshot product query, catalog/products create, merch module scaffold, pos_terminal cashier hashing).

**Tech Stack:** Medusa v2, TypeScript, MedusaService auto-CRUD, Jest HTTP integration tests (`@medusajs/test-utils`), Vitest for the PoS api-client tests, Playwright for live verification.

**Decisions locked (user, 2026-05-30):**
1. **Product create → NEW manager endpoint** (not extend `/admin/catalog/products`). Leaves CSV-import / classify callers untouched.
2. **Schema validation → pragmatic: store, don't enforce.** Persist `schema_fields` + `merch_category_id`; no per-category required-field check; **no UI change → no design gate.**
3. **Tags → new `pos_tag` table + service.**

**Branch:** continue on `phase-h3-2c-manager-surfaces` (HEAD `7d2e2d9`). One commit per task. NO new branch.

---

## Conventions (carried from Pass 1 / H-3.2c)

- **HTTP integration tests run ONE AT A TIME:** `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit "<one spec file>"` (from `backend/apps/backend`). Never batch — they contend on the shared test DB.
- **Admin auth in HTTP tests:** reuse `bootstrapAdmin(api, getContainer())` — already inlined in `integration-tests/http/admin-merch.spec.ts` (and others). Copy that helper into each new spec (it is not yet extracted to a shared file).
- **`req.audit_context = { vendor_id }`** must be set BEFORE any mutation so the audit middleware stamps the row on `res` finish.
- **Service registration keys:** grep a module's `index.ts` for `Module(...)`. `merch`→`"merch"`, product→`"product"`, wms→`"wmsService"`, pos_terminal→`"posTerminalService"`, catalog_schema→`"catalogSchemaService"`.
- **Vendor↔product link:** products carry `metadata.created_by_vendor_id`. Query pattern (from `admin/pos-terminal/catalog-snapshot/route.ts`): `product.listProducts({ metadata: { created_by_vendor_id: vendor_id } }, { relations: ["variants"], take })`, then `wms.getStock(vendor_id, variant_id) → { on_hand, available }`.
- **PoS api-client tests** (the binding Pass-1 DoD): mock `../../src/api/client`, assert the exact path/method + response→type mapping. Screen unit tests mock the clients so they cannot catch a wrong URL/shape.
- **`.js` shadows** in `backend/apps/pos/src/` resolve before `.ts` in Vite/Vitest — `rm -f` the sibling after editing an api file; restart the Vite dev server if it cached one.
- **Live verify:** stack is already up (backend :9000 `medusa develop` hot-reloads, pos :9200, pg :5433). Manager login: QA Manager / PIN 4242 in `v_test`. `v_test` already has 2 merch categories (Bakery, Dairy & Eggs) from Pass-1 testing.
- **Vitest:** `vi.fn`/`vi.mock`, `fireEvent` (no `@testing-library/user-event`).

---

## Task P2-1: Manager products LIST endpoint + re-point `listProducts`

**Files:**
- Create: `backend/apps/backend/src/api/admin/catalog/manager-products/route.ts` (GET)
- Modify: `backend/apps/backend/src/api/middlewares.ts` (gate the new path)
- Create: `backend/apps/backend/integration-tests/http/admin-manager-products.spec.ts`
- Modify: `backend/apps/pos/src/api/catalog.ts` (`listProducts` URL)
- Create: `backend/apps/pos/tests/api/catalog-listProducts.test.ts`

Background: `CatalogListScreen` groups products by `merch_category_id`. `catalog.ts listProducts` currently calls `GET /admin/products` — a **Medusa core route** that returns core products (no vendor scope, no merch link). Build a vendor-scoped list returning the card fields the grid needs.

- [ ] **Step 1 — Write the failing HTTP test.** Create `admin-manager-products.spec.ts`: copy `bootstrapAdmin` from `admin-merch.spec.ts`. Seed a product via the product module with `metadata.created_by_vendor_id = "v_mp"` and `metadata.merch_category_id = "mc_1"`, one variant (sku `S1`, barcode `B1`, price 1500 iqd). Then:
```ts
const r = await api.get('/admin/catalog/manager-products?vendor_id=v_mp', { headers: adminHeaders })
expect(r.status).toBe(200)
expect(r.data.products).toHaveLength(1)
const p = r.data.products[0]
expect(p).toMatchObject({ merch_category_id: 'mc_1', title: expect.any(String), sku: 'S1', barcode: 'B1', price_minor: 1500 })
expect(p).toHaveProperty('stock_qty')
expect(p).toHaveProperty('variant_id')
```
Plus a `400 when vendor_id missing` case.

- [ ] **Step 2 — Run it, confirm 404.** `...jest ... "integration-tests/http/admin-manager-products.spec.ts"` → fails (route 404).

- [ ] **Step 3 — Implement the GET route** (clone the catalog-snapshot query, add merch link + card shape):
```ts
// backend/apps/backend/src/api/admin/catalog/manager-products/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' })
  const product: any = req.scope.resolve('product')
  const wms: any = req.scope.resolve('wmsService')
  const rows = await product.listProducts(
    { metadata: { created_by_vendor_id: vendor_id } },
    { relations: ['variants'], take: 5000 },
  ).catch(() => [])
  const products: any[] = []
  for (const p of rows) {
    const v = (p.variants ?? [])[0]
    let stock_qty = 0
    if (v) { try { stock_qty = (await wms.getStock(vendor_id, v.id)).on_hand } catch { /* 0 */ } }
    products.push({
      id: p.id,
      variant_id: v?.id ?? null,
      merch_category_id: (p.metadata?.merch_category_id as string) ?? null,
      title: p.title,
      sku: v?.sku ?? null,
      barcode: v?.barcode ?? null,
      price_minor: Number(v?.prices?.[0]?.amount ?? 0),
      currency_code: v?.prices?.[0]?.currency_code ?? 'iqd',
      stock_qty,
      thumb: p.thumbnail ?? null,
    })
  }
  res.json({ products })
}
```

- [ ] **Step 4 — Gate the route** in `middlewares.ts` (find the `routes:` array; add after the audit-log entry):
```ts
{ matcher: '/admin/catalog/manager-products', method: ['GET'], middlewares: [requirePermission('catalog.manage')] },
```
(Confirm `catalog.manage` exists in `src/permissions/capabilities.ts`; if the catalog read cap is named differently — e.g. `catalog.view` — use that. grep `CAPABILITIES` first.)

- [ ] **Step 5 — Run the HTTP test → green.**

- [ ] **Step 6 — Re-point the client.** In `backend/apps/pos/src/api/catalog.ts`, change `listProducts`:
```ts
export async function listProducts(vendorId: string): Promise<Product[]> {
  const r = await apiGet<any>(
    `/admin/catalog/manager-products?vendor_id=${encodeURIComponent(vendorId)}`,
  );
  return r.products ?? [];
}
```
Delete `backend/apps/pos/src/api/catalog.js` if present.
**Field reconciliation:** the `Product` type in `catalog.ts` has `thumb_emoji` (not `thumb`) and no `currency_code`-less assumptions — confirm the field names the endpoint returns match the `Product` type the screen consumes. Either align the endpoint key to `thumb_emoji`, or map in `listProducts` (`{ ...p, thumb_emoji: p.thumb }`). Open `CatalogListScreen.tsx` to confirm which product fields it actually reads (title/price_minor/stock_qty/sku/barcode/merch_category_id at minimum) and ensure all are present.

- [ ] **Step 7 — Add the api-client test.** `backend/apps/pos/tests/api/catalog-listProducts.test.ts`: mock `../../src/api/client`, make `apiGet` resolve `{ products: [{ id:'p1', variant_id:'v1', merch_category_id:'mc1', title:'Milk', sku:'S', barcode:'B', price_minor:1500, currency_code:'iqd', stock_qty:7, thumb:null }] }`; assert `apiGet` called with `'/admin/catalog/manager-products?vendor_id=v_test'` and the returned array maps through unchanged (length 1, `merch_category_id:'mc1'`, `stock_qty:7`). Add an empty-payload case (`{}` → `[]`).

- [ ] **Step 8 — Run pos vitest for the new file → green.**

- [ ] **Step 9 — LIVE VERIFY.** In the running app (after `medusa develop` hot-reloads): manager → Catalog. Confirm `GET /admin/catalog/manager-products?vendor_id=v_test => 200` (network), no `/admin/products` call, no console errors, and the grid renders grouped-by-department (empty product groups OK until P2-2). Screenshot to `docs/superpowers/h3-2d-smoke/manager-products.png`.

- [ ] **Step 10 — Commit:** `feat(api): GET /admin/catalog/manager-products (vendor-scoped card list) + re-point listProducts`.

---

## Task P2-2: Manager product CREATE endpoint + re-point `createProduct`

**Files:**
- Create: `backend/apps/backend/src/api/admin/catalog/manager-products/route.ts` — ADD a `POST` export to the file from P2-1.
- Modify: `backend/apps/backend/src/api/middlewares.ts` (add POST method to the matcher)
- Create: `backend/apps/backend/integration-tests/http/admin-manager-products-create.spec.ts`
- Modify: `backend/apps/pos/src/api/catalog.ts` (`createProduct` URL)
- Create: `backend/apps/pos/tests/api/catalog-createProduct.test.ts`

Background: the AddProduct form (`AddProductScreen.tsx:117`) sends `{ vendor_id, title, price_minor, currency_code, merch_category_id, sku, barcode, initial_on_hand, cost_price_minor, brand, supplier_name, description, tags, low_stock_threshold, internal_notes, schema_fields }`. Per decisions #1/#2: new endpoint, store everything, enforce nothing beyond the basics. Mirror `admin/catalog/products/route.ts` for product+variant+WMS creation but key on `merch_category_id`.

- [ ] **Step 1 — Failing HTTP test.** `admin-manager-products-create.spec.ts` (copy `bootstrapAdmin`):
```ts
const create = await api.post('/admin/catalog/manager-products', {
  vendor_id: 'v_cp', title: 'Pinar Milk 1L', price_minor: 1500, currency_code: 'iqd',
  merch_category_id: 'mc_dairy', sku: 'PM1', barcode: '8690', initial_on_hand: 12,
  cost_price_minor: 1100, brand: 'Pinar', supplier_name: 'ACME', tags: ['halal'],
  low_stock_threshold: 3, internal_notes: 'aisle 4', schema_fields: { pack_size: '1L' },
}, { headers: adminHeaders }).catch((e:any)=>e.response)
expect(create.status).toBe(201)
expect(create.data.product.id).toBeDefined()

// it appears in the manager list with the merch link + stock
const list = await api.get('/admin/catalog/manager-products?vendor_id=v_cp', { headers: adminHeaders })
const p = list.data.products.find((x:any)=>x.title==='Pinar Milk 1L')
expect(p).toMatchObject({ merch_category_id: 'mc_dairy', sku: 'PM1', price_minor: 1500, stock_qty: 12 })
```
Plus `400 when title/price_minor/currency_code/vendor_id missing`.

- [ ] **Step 2 — Confirm 404/405.**

- [ ] **Step 3 — Implement POST** (append to `manager-products/route.ts`):
```ts
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body ?? {}) as any
  for (const k of ['vendor_id','title','price_minor','currency_code']) {
    if (b[k] == null) return res.status(400).json({ error: `${k} required` })
  }
  ;(req as any).audit_context = { vendor_id: b.vendor_id }
  const product: any = req.scope.resolve('product')
  const created = await product.createProducts({
    title: String(b.title),
    description: b.description ?? null,
    thumbnail: b.thumb ?? b.thumbnail ?? null,
    status: 'published',
    metadata: {
      created_by_vendor_id: b.vendor_id,
      merch_category_id: b.merch_category_id ?? null,
      cost_price_minor: b.cost_price_minor ?? null,
      brand: b.brand ?? null,
      supplier_name: b.supplier_name ?? null,
      tags: Array.isArray(b.tags) ? b.tags : [],
      low_stock_threshold: b.low_stock_threshold ?? null,
      internal_notes: b.internal_notes ?? null,
      schema_fields: b.schema_fields ?? {},
    },
    options: [{ title: 'Default', values: ['Default'] }],
    variants: [{
      title: 'Default', sku: b.sku ?? null, barcode: b.barcode ?? null,
      manage_inventory: false,
      prices: [{ amount: Number(b.price_minor), currency_code: String(b.currency_code) }],
      options: { Default: 'Default' },
    }],
  })
  const p = Array.isArray(created) ? created[0] : created
  if (b.initial_on_hand && b.initial_on_hand > 0) {
    const variantId = p?.variants?.[0]?.id
    if (variantId) {
      const wms: any = req.scope.resolve('wmsService')
      await wms.incrementStock({ vendor_id: b.vendor_id, variant_id: variantId,
        qty: Number(b.initial_on_hand), type: 'restock', note: 'manager add-product initial on_hand' })
    }
  }
  res.status(201).json({ product: p })
}
```
(Confirm `wms.incrementStock` signature against `admin/catalog/products/route.ts` — it is the same call used there.)

- [ ] **Step 4 — Add POST to the middleware matcher:** `method: ['GET','POST']`, gate POST with `requirePermission('catalog.manage')`. (If GET/POST need different caps, split into two matcher entries.)

- [ ] **Step 5 — HTTP test → green** (run individually).

- [ ] **Step 6 — Re-point the client.** `catalog.ts`:
```ts
export async function createProduct(input: CreateProductInput) {
  return apiPost('/admin/catalog/manager-products', input);
}
```

- [ ] **Step 7 — api-client test.** `catalog-createProduct.test.ts`: mock client; assert `apiPost` called with `'/admin/catalog/manager-products'` and the exact input object passed through.

- [ ] **Step 8 — pos vitest → green.**

- [ ] **Step 9 — LIVE VERIFY (full scenario).** Manager → Add product → fill required (title, price, pick a department = Bakery/Dairy & Eggs) + a couple rich fields → Save. Confirm `POST /admin/catalog/manager-products => 201`, then Catalog shows the product under its department with correct price/stock. Add a 2nd product to a different dept; confirm grouping. Screenshot `docs/superpowers/h3-2d-smoke/add-product.png`. Fix any issue found before moving on.

- [ ] **Step 10 — Commit:** `feat(api): POST /admin/catalog/manager-products (merch-bucket create + WMS seed) + re-point createProduct`.

---

## Task P2-3: `pos_tag` module + `/admin/tags` CRUD + re-point `tags.ts`

**Files:**
- Create: `backend/apps/backend/src/modules/pos_tag/models/pos-tag.ts`
- Create: `backend/apps/backend/src/modules/pos_tag/service.ts`
- Create: `backend/apps/backend/src/modules/pos_tag/index.ts`
- Create (generated): `backend/apps/backend/src/modules/pos_tag/migrations/*.ts`
- Modify: `backend/apps/backend/medusa-config.ts` (register module at the `modules:` array, ~line 21)
- Create: `backend/apps/backend/src/api/admin/tags/route.ts` (GET list, POST create)
- Create: `backend/apps/backend/src/api/admin/tags/[id]/route.ts` (PATCH, DELETE)
- Modify: `backend/apps/backend/src/api/middlewares.ts`
- Create: `backend/apps/backend/integration-tests/http/admin-tags.spec.ts`
- Modify: `backend/apps/pos/src/api/tags.ts`
- Create: `backend/apps/pos/tests/api/tags.test.ts`

Background: `TagsScreen` shows a featured/all split with reorder. Need vendor-scoped tags with a `featured` flag + `position`. Scaffold mirrors the `merch` module (`models/merch-category.ts` + `service.ts` + `index.ts`). FIRST read `tags.ts` + `TagsScreen.tsx` to capture the exact client method names/shapes (`listTags`/`createTag`/`updateTag`/`deleteTag`/`promoteToFeatured`) and match them.

- [ ] **Step 1 — Define the model** (`pos-tag.ts`, mirror `merch-category.ts`):
```ts
import { model } from '@medusajs/framework/utils'
export const PosTag = model.define('pos_tag', {
  id: model.id().primaryKey(),
  vendor_id: model.text(),
  name: model.text(),
  slug: model.text(),
  featured: model.boolean().default(false),
  position: model.number().default(0),
}).indexes([{ on: ['vendor_id', 'slug'], unique: true }, { on: ['vendor_id'] }])
```

- [ ] **Step 2 — Service** (`service.ts`, mirror `MerchService` with `listForVendor` + slugify + a `setFeatured` helper):
```ts
import { MedusaService } from '@medusajs/framework/utils'
import { PosTag } from './models/pos-tag'
function slugify(n: string){ return n.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') }
class PosTagService extends MedusaService({ PosTag }) {
  async listForVendor(vendor_id: string){ return this.listPosTags({ vendor_id }, { order: { featured: 'DESC', position: 'ASC', name: 'ASC' } }) }
  async createForVendor(vendor_id: string, d: { name: string; featured?: boolean; position?: number }){
    const slug = slugify(d.name)
    const [dup] = await this.listPosTags({ vendor_id, slug })
    if (dup) throw new Error(`tag "${slug}" already exists`)
    return this.createPosTags({ vendor_id, name: d.name, slug, featured: !!d.featured, position: d.position ?? 0 })
  }
}
export default PosTagService
```

- [ ] **Step 3 — index.ts:** `export const POS_TAG_MODULE = 'pos_tag'; export default Module(POS_TAG_MODULE, { service: PosTagService })`.

- [ ] **Step 4 — Register** in `medusa-config.ts` modules array: `{ resolve: "./src/modules/pos_tag" },`.

- [ ] **Step 5 — Generate + run migration:** `cd backend/apps/backend && npx medusa db:generate pos_tag && npx medusa db:migrate`. Confirm a migration file appears under `src/modules/pos_tag/migrations/` and the `pos_tag` table is created (the running dev server picks up the migration after `db:migrate`).

- [ ] **Step 6 — Failing HTTP test** `admin-tags.spec.ts` (copy `bootstrapAdmin`): create → list (featured-first order) → patch (rename + toggle featured) → delete (gone) → duplicate-slug 409. Use real `api.get/post/patch/delete` with `?vendor_id=` / body `{ vendor_id, ... }`.

- [ ] **Step 7 — Routes.** `admin/tags/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { POS_TAG_MODULE } from '../../../modules/pos_tag'
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' })
  const svc: any = req.scope.resolve(POS_TAG_MODULE)
  res.json({ tags: await svc.listForVendor(vendor_id) })
}
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body ?? {}) as any
  if (!b.vendor_id || !b.name) return res.status(400).json({ error: 'vendor_id and name required' })
  ;(req as any).audit_context = { vendor_id: b.vendor_id }
  const svc: any = req.scope.resolve(POS_TAG_MODULE)
  try { res.status(201).json({ tag: await svc.createForVendor(b.vendor_id, b) }) }
  catch (e:any) { res.status(409).json({ error: e.message }) }
}
```
`admin/tags/[id]/route.ts` PATCH/DELETE — use the **object form** `updatePosTags({ id, ...allowed })` (the exact bug fixed in Pass 1 — do NOT pass id positionally) and `deletePosTags(req.params.id)`. PATCH allows `name`/`featured`/`position`. Set `req.audit_context` from the row's `vendor_id` before mutating.

- [ ] **Step 8 — Gate** both matchers in `middlewares.ts` with `requirePermission('catalog.manage')` (or the tags cap if one exists). `GET` on `/admin/tags*`, `POST` on `/admin/tags`, `PATCH`/`DELETE` on `/admin/tags/*`.

- [ ] **Step 9 — HTTP test → green** (individually).

- [ ] **Step 10 — Re-point `tags.ts`** to `/admin/tags` (+ `/admin/tags/:id`), unwrapping `{tags}` / `{tag}`. Match the existing exported method names the screen imports. Add `tests/api/tags.test.ts` asserting each path + mapping.

- [ ] **Step 11 — pos vitest → green.**

- [ ] **Step 12 — LIVE VERIFY (full scenario).** Manager → Tags → add a tag, mark featured, rename, delete. Confirm 200/201/204 on `/admin/tags*`, UI updates, featured split correct, no console errors. Screenshot `docs/superpowers/h3-2d-smoke/tags.png`.

- [ ] **Step 13 — Commit:** `feat(tags): pos_tag module + /admin/tags CRUD + re-point tags client`.

---

## Task P2-4: Staff reset-PIN endpoint + re-point `resetPin`

**Files:**
- Modify: `backend/apps/backend/src/modules/pos_terminal/service.ts` (add `resetCashierPin`)
- Create: `backend/apps/backend/src/api/admin/pos-terminal/cashiers/[id]/reset-pin/route.ts` (POST)
- Modify: `backend/apps/backend/src/api/middlewares.ts`
- Create: `backend/apps/backend/integration-tests/http/admin-cashier-reset-pin.spec.ts`
- Modify: `backend/apps/pos/src/api/staff.ts` (`resetPin` URL)
- Create: `backend/apps/pos/tests/api/staff-resetPin.test.ts`

Background: `staff.ts resetPin` posts to `/admin/staff/:id/reset-pin` (404). Build it under the existing cashiers surface. `createCashier` (service.ts:247) shows the hashing pattern: `randomBytes(16).toString('hex')` salt + `hashPin(pin, salt)`, persisted as `pin_hash`/`pin_salt`.

- [ ] **Step 1 — Failing HTTP test** `admin-cashier-reset-pin.spec.ts` (copy `bootstrapAdmin`): create a cashier via `getContainer().resolve('posTerminalService').createCashier({...role:'cashier', pin:'1111'})`; POST `/admin/pos-terminal/cashiers/:id/reset-pin` `{ pin: '8264' }` → 200 `{ ok: true }`; then `verifyCashierPin(id, '8264')` resolves and `verifyCashierPin(id,'1111')` rejects. Plus `400 on missing/!=4-digit pin`.

- [ ] **Step 2 — Confirm 404.**

- [ ] **Step 3 — Service method** (`service.ts`, near `createCashier`; `hashPin`/`randomBytes` are already imported):
```ts
async resetCashierPin(cashierId: string, pin: string): Promise<{ ok: true }> {
  const salt = randomBytes(16).toString('hex')
  const pin_hash = hashPin(pin, salt)
  await (this as any).updateCashiers({ id: cashierId, pin_hash, pin_salt: salt })
  return { ok: true }
}
```

- [ ] **Step 4 — Route** `cashiers/[id]/reset-pin/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = (req.params as any).id as string
  const pin = ((req.body ?? {}) as any).pin
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'pin must be 4 digits' })
  const svc: any = req.scope.resolve('posTerminalService')
  const cashier = await svc.retrieveCashier?.(id).catch(() => null)
  ;(req as any).audit_context = { vendor_id: cashier?.vendor_id }
  res.json(await svc.resetCashierPin(id, pin))
}
```
(If `retrieveCashier` doesn't exist, resolve vendor_id via `listAndCountCashiers({ id })`; the audit row just needs the vendor_id. **Ensure the raw `pin` is never written into the audit `after_json`** — Pass 4 hardens this globally, but do not echo `pin` in the response or pass it to anything audited.)

- [ ] **Step 5 — Gate** in `middlewares.ts`: `{ matcher: '/admin/pos-terminal/cashiers/*/reset-pin', method: ['POST'], middlewares: [requirePermission('staff.manage')] }`.

- [ ] **Step 6 — HTTP test → green** (individually).

- [ ] **Step 7 — Re-point `staff.ts`:**
```ts
export async function resetPin(id: string, pin: string): Promise<{ ok: boolean }> {
  return apiPost(`/admin/pos-terminal/cashiers/${encodeURIComponent(id)}/reset-pin`, { pin });
}
```
Update the leading comment (drop the "may not exist" note).

- [ ] **Step 8 — api-client test** `staff-resetPin.test.ts`: assert `apiPost` called with `'/admin/pos-terminal/cashiers/psc_x/reset-pin'` + `{ pin:'4242' }`.

- [ ] **Step 9 — pos vitest → green.**

- [ ] **Step 10 — LIVE VERIFY.** Manager → PIN reset → Reset for QA Manager → enter a non-sequential/non-repeated PIN → Save. Confirm `POST …/reset-pin => 200`, modal closes, no error. (Then re-login flow still works with the new PIN — or reset it back to 4242 to keep the test fixture stable.) Screenshot `docs/superpowers/h3-2d-smoke/pin-reset-success.png`.

- [ ] **Step 11 — Commit:** `feat(api): POST /admin/pos-terminal/cashiers/:id/reset-pin + re-point resetPin`.

---

## Acceptance (after P2-1…P2-4)

- [ ] Full PoS vitest suite green (`npx vitest run`), pos `tsc --noEmit` 0 errors.
- [ ] Every new/changed backend HTTP spec green, run ONE AT A TIME (loop each file).
- [ ] Live walk clean on all four surfaces (Catalog list+add, Tags CRUD, PIN reset) with screenshots saved under `docs/superpowers/h3-2d-smoke/`.
- [ ] Reset the QA Manager PIN back to 4242 if it was changed, so the `v_test` fixture stays stable for Pass 3/4.
- [ ] Update `docs/superpowers/plans/2026-05-30-phase-h3-2d-progress.md` (Pass 2 section) + memory.
- [ ] Then Pass 3 (approvals model — its own gate; Option B triggers the design gate).
