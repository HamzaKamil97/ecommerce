# Phase H-3.2d · Progress checkpoint

**Branch:** `phase-h3-2c-manager-surfaces` (manager mode ships as one unit; no new branch)
**Plan(s):** Pass 1 → [2026-05-30-phase-h3-2d-pass1-repoint-clients.md](2026-05-30-phase-h3-2d-pass1-repoint-clients.md)
**As of:** 2026-05-30

## Status — Pass 1 of 4 COMPLETE

| Pass | Scope | Status |
|---|---|---|
| **1** | Re-point clients to existing endpoints (3 screens) | ✅ **DONE** |
| 2 | Build missing endpoints (manager products list, product-create reconcile, tags CRUD, staff reset-pin) | ⏳ next |
| 3 | Approvals model decision (A: pos_refund_request table · B: audit-log view → design gate) | ⏳ |
| 4 | Session + audit hygiene (persist cashier→localStorage / manager→sessionStorage; strip PIN from audit after_json) | ⏳ |

## Pass 1 — what shipped (3 commits off `d6fe7ff`)

| Commit | Change |
|---|---|
| `6676574` | `api/departments.ts` → `/admin/tenants/:id/merch-categories` (list/create/update CRUD); `updateDepartment` gained leading `tenantId` arg + call-site update in `DepartmentsScreen.tsx`; `reorderDepartments` unchanged (A4 route). |
| `0cbcd6f` | `api/catalog.ts` `listDepartments` (the separate catalog-flavored copy feeding the catalog rail) → same merch route. `listProducts`/`createProduct` left for Pass 2. |
| `4c05b14` | `api/staff.ts` `listStaff` → `/admin/pos-terminal/cashiers?vendor_id=`; mapper defaults `permission_overrides: {}` + `last_active_at: null` so `PinResetScreen.resolveLabel` can't TypeError. `resetPin` left for Pass 2. |

**Verification:**
- pos vitest **208 passing** (58 files) — 198 prior + 10 new api-client tests (5 departments + 2 catalog + 3 staff).
- pos `tsc --noEmit` **0 errors**.
- Each re-point has an **api-client-level test** that mocks the `./client` transport and asserts the exact path/method + the response→type mapping. This is the binding DoD: the screen unit tests mock these clients, so a wrong URL/shape would NOT fail them — the new transport tests close that gap.
- Two-stage review (spec compliance → code quality) run per task; all PASS. Only cosmetic minors noted (no blockers).

## Live verification — DONE 2026-05-30 (Playwright, full scenarios)

Per the user's "full scenario testing" directive, the deferred live walk was run immediately (not at end-of-phase). Stack was already up (backend :9000 `medusa develop`, pos :9200, pg :5433). Logged in QA Manager / 4242 → manager mode.

**Departments — fully exercised, all green:**
- list → `GET /admin/tenants/v_test/merch-categories` 200 (no `/admin/departments*` 404)
- add "Dairy" (Enter-key submit) → `POST …/merch-categories` 201, row appears, count 0→1
- rename "Dairy"→"Dairy & Eggs" → `PATCH …/merch-categories/:id` **200** (see bug below), persists
- reorder via drag → `PUT /admin/departments/reorder` 200, Bakery moved above Dairy, persisted
- empty state + theme (paper/gold/dark header) visually correct (screenshot `h3-2d-departments-empty.png`)

**Catalog rail — green:** `catalog.ts listDepartments` re-point populates the dept tab-rail (Bakery / Dairy & Eggs) + grouped "0 products" sections with "+ Add to X" CTAs.

**PIN reset — green:** `GET /admin/pos-terminal/cashiers?vendor_id=v_test` 200 → "1 active", QA Manager row, 3 capability pills all "Allowed" (manager role defaults). **Validates the `permission_overrides: {}` default live** — `resolveLabel` reads `row.permission_overrides[key]` with no crash. Reset modal UI renders (keypad + dice + backspace, screenshot `h3-2d-pinreset-modal.png`). Reset *action* is Pass 2 (endpoint not built) — not exercised.

### 🐛 BUG FOUND + FIXED during the walk — merch-category PATCH (commit `59a5e76`)
Rename 404'd live: `MerchCategory with id "" not found`. Root cause (proved with a temporary `req.params` echo — params were fine): the PATCH handler called `merch.updateMerchCategories(req.params.id, allowed)` **positionally**; MedusaService `update` expects the **object form** `{ id, ...fields }` (as the sibling `tenants/[id]` route already does), so id resolved to `""`. Fixed + added PATCH-rename & DELETE regression tests to `admin-merch.spec.ts` (suite previously only covered create/list/duplicate). `admin-merch.spec.ts` 4/4 green. *(DELETE was always fine — `deleteMerchCategories(string)` is the correct positional signature.)*

### ⚠ Pass 2 blocker discovered live
`catalog.ts listProducts` → `GET /admin/products?vendor_id=v_test` returns **200, not 404** — `/admin/products` is a **built-in Medusa core route** returning core products (empty), NOT the vendor's manager catalog. So Pass 2 CANNOT add a route at `/admin/products` (collides with core). Use a distinct path (e.g. `/admin/catalog/products` or `/admin/tenants/:id/products`) and re-point `listProducts` there.

### Minor nits (non-blocking, already-approved surfaces)
- ManagerLayout "Exit Manager" / "Back to Register" render as unstyled native buttons.
- PinModal doesn't close on Escape (only ✕ / Cancel).
- Pre-existing CORS error on `GET /pos/alerts?vendor_id=v_test` from :9200 (alerts feature, unrelated to H-3.2d).

Test data left in `v_test`: 2 merch categories (Bakery, Dairy & Eggs) — harmless, useful for Pass 2 catalog testing.

## Carry-forwards into Pass 2

- **`/admin/products` base route does not exist** — `catalog.ts` `listProducts` still 404s. Pass 2 builds `GET /admin/products?vendor_id=` returning `merch_category_id` + card fields (title/sku/barcode/price_minor/stock_qty/thumb) so `CatalogListScreen` can group by department; then re-point `listProducts` + verify.
- **Product create contract clash** — `catalog.ts` `createProduct` POSTs a flat rich payload to `/admin/products` (404). Existing `POST /admin/catalog/products` requires `category_handle` + schema-validated `schema_fields`. Pass 2 must RECONCILE (extend existing vs new manager endpoint) — do not ship a duplicate or a 400-on-every-save.
- **`resetPin`** still targets `/admin/staff/:id/reset-pin` (404). Pass 2 builds `POST /admin/pos-terminal/cashiers/:id/reset-pin` and re-points `resetPin`.
- **Tags** — `api/tags.ts` + `TagsScreen` fail-soft to empty; `/admin/tags` has no table/route yet. Pass 2 builds full CRUD.
- **Cashier roster lacks `permission_overrides`/`last_active_at`** — `GET /admin/pos-terminal/cashiers` doesn't expose them, so PIN-reset capability pills show role defaults only. If real per-cashier overrides need to surface on this screen, extend the cashiers list payload (or read via `/admin/staff/:id`) — currently out of scope.

## Pass 1 gotchas (for future PoS api work)

- **Gitignored `.js` shadows** in `backend/apps/pos/src/` are resolved by Vitest/Vite BEFORE the `.ts`/`.tsx` source. After editing an api/screen file, `rm -f` its `.js` sibling so the runner picks up the source. Committed state (no `.js`) is correct for fresh checkout/CI.
- **`VENDOR_ID === 'v_test'` in tests** — `backend/apps/pos/.env` sets `VITE_VENDOR_ID=v_test`, loaded by Vite during test runs. Screen tests can assert calls with `'v_test'` directly (no env mock needed).
- **Two `listDepartments`** exist (`catalog.ts` + `departments.ts`) with separate `Department` types — catalog's has no `tenant_id`. Both were 404ing; both re-pointed.
