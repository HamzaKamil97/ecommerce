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

## DoD note — live verification DEFERRED

Live Playwright verification (running pg + backend :9000 + pos :9200, manager login QA Manager / 4242 in `v_test`) was **deferred to the end-of-phase manual browser walk** (after Pass 4), per the plan's "AND/OR" clause. The api-client tests are the binding gate for Pass 1. When the live walk runs, confirm: Departments list/add/rename/reorder hits `/admin/tenants/v_test/merch-categories` + `/admin/departments/reorder` (no `/admin/departments*` 404s); catalog rail populates from merch categories; PIN-reset staff list renders cashiers with role-default capability pills and no crash.

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
