# Phase H-3.2d · Progress checkpoint

**Branch:** `phase-h3-2c-manager-surfaces` (manager mode ships as one unit; no new branch)
**Plan(s):** Pass 1 → [2026-05-30-phase-h3-2d-pass1-repoint-clients.md](2026-05-30-phase-h3-2d-pass1-repoint-clients.md)
**As of:** 2026-05-30

## Status — Pass 3 of 4 COMPLETE

| Pass | Scope | Status |
|---|---|---|
| **1** | Re-point clients to existing endpoints (3 screens) | ✅ **DONE** |
| **2** | Build missing endpoints (manager products list, product-create reconcile, tags CRUD, staff reset-pin) | ✅ **DONE** |
| **3** | Approvals model — Option A `pos_refund_request` store + wire manager tray | ✅ **DONE** |
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

## Pass 2 — DONE 2026-05-30 (subagent-driven: impl → spec review → quality review → fix → live verify, per task)

Plan: [2026-05-30-phase-h3-2d-pass2-build-endpoints.md](2026-05-30-phase-h3-2d-pass2-build-endpoints.md). User decisions: new manager endpoint (not extend); store-don't-enforce schema; new `pos_tag` table.

| Task | Commits | Endpoint | Live verified |
|---|---|---|---|
| P2-1 | `c3121ba` + `fd0dde8` | `GET /admin/catalog/manager-products` (vendor card-list) + re-point `listProducts` | Catalog grid loads grouped by dept; 200 not 403 (cap change) |
| P2-2 | `7a7adf0` + `5667b24` | `POST /admin/catalog/manager-products` (merch-bucket create, `createProductsWorkflow`+WMS seed) + re-point `createProduct` | Added "Sourdough Loaf" via form → 201 → shows under Bakery w/ SKU/2,500 IQD/stock 20 |
| P2-3 | `b88e457` + `9aae70f` | `pos_tag` module + migration + `/admin/tags` CRUD + finish `tags.ts` | Seeded 2 tags via API; promote/demote (`featured:true/false`) live → 200, correct re-render |
| P2-4 | `b5876c2` + `d528bf6` | `POST /admin/pos-terminal/cashiers/:id/reset-pin` + re-point `resetPin` | Reset QA Manager PIN as manager → 200 (gate `staff.reset_pin`); restored to 4242 |

**New backend infra:** `pos_tag` module (model/service/index/migration, registered in medusa-config); new capability `catalog.view_products` (owner/manager/cashier). Routes gated: manager-products GET→`catalog.view_products`, POST→`catalog.add_edit_product`; tags→`catalog.manage_tags`; reset-pin→`staff.reset_pin`.

**Key adaptations (verified correct):** product create/seed uses `createProductsWorkflow` (NOT `productModule.createProducts`) — only the workflow writes `product_variant_price_set`, so the GET's raw-SQL price read returns a real price. `/admin/catalog/manager-products` is a distinct path because `/admin/products` is a Medusa CORE route.

**Verification:** pos vitest **221 green** (208 + 13 new api-client tests), pos tsc 0. Backend: all 4 new HTTP suites green individually (manager-products 2, create 2, tags 8, reset-pin 3) + regression spot-check (permission-middleware 1/1, admin-staff-capabilities 3/3, capabilities 5/5). Two-stage review per task; final integration review = READY.

**Bugs found + fixed during Pass 2 reviews/live:**
- P2-2: workflow create wasn't try/caught → would leak 500 on bad input; wrapped (400 vs 500-partial-stock).
- P2-4: reset-pin gated on `staff.manage` (OWNER-ONLY) → manager would 403 on their own screen. Fixed to `staff.reset_pin`. + 404 guard on unknown cashier.
- P2-1: N+1 sequential `wms.getStock` → `Promise.allSettled` fan-out; read route gated on a write cap → added `catalog.view_products`.
- P2-3: empty-slug guard; un-feature test coverage.

**Findings carried forward (not blocking Pass 2):**
- **Tag manager has NO manual "add tag" UI** — creates only via the out-of-scope AI-suggestions flow (fail-soft empty). A manager can't create a tag from this screen today. Adding an input = new UI → design gate. **Decide in a future UI pass.**
- `tags.ts listTags` keeps a dead `r.rows ?? []` fallback (cosmetic); `AddProductScreen` doesn't pass `thumb_emoji` (products show 📦 placeholder — emoji picker is future UI).
- Raw PIN still reaches audit `after_json` (createCashier + reset-pin) — **Pass 4's explicit scope** strips it globally + adds a test. Code comment left at the reset-pin site.
- **Operational:** every pos client re-point leaves a stale `.js` shadow that breaks Vite HMR (404 on `<file>.js` + HMR reload fail) → **restart the pos Vite dev server after each re-point** before live verify. Hit on catalog/tags/staff. Also: `medusa develop` briefly drops :9000 connections while hot-reloading route/module/config changes (transient ERR_CONNECTION_REFUSED, self-recovers).
- Manager screens overlap header/footer controls at narrow (<~1000px) widths (responsive nit; fine at desktop — `elementFromPoint` confirms CTAs are clickable). Playwright is over-conservative clicking sticky-footer CTAs (use JS dispatch in automation; real users unaffected).

## Pass 3 — DONE 2026-05-30 (subagent-driven, with full live verify)

Plan: [2026-05-30-phase-h3-2d-pass3-approvals-model.md](2026-05-30-phase-h3-2d-pass3-approvals-model.md). **Decision: Option A** (real `pos_refund_request` store — NOT Option B audit-view). Chosen because it makes the Approvals tray a real cashier→manager approval workflow (Loyverse/Talabat pattern), is backend-only (the tray UI was already a complete shell → NO design gate), and completes the feature properly.

| Task | Commits | What |
|---|---|---|
| P3-1 | `46752f7` | `pos_refund_request` module (model/service/index/migration; payload JSONB stores the ProcessReturnInput) |
| P3-2 | `8f1b88b` | `GET`/`POST /admin/approvals/refunds` (list pending queue + create request) |
| P3-3 | `4f7f6ea` + `bc5a6a3` | rewrote `POST /admin/approvals/refunds/bulk` from inline-payloads to **approval-ID contract** → resolves ids, `processReturn(stored payload)` on approve, markStatus; full rollback (stock re-decrement + soft-delete refund sale + status revert) |
| P3-4 | `34ffebe` + `41bc924` | wired `approvals.ts` client (real list + bulk + `createRefundRequest`) + fixed the `original_sale_id`→`sale_id` display mapping |

**Caps:** GET queue → `pos.refund_or_void` (manager-granted); POST create → `pos.return_process`; bulk → `pos.refund_or_void`.

**Live verification (full workflow, Playwright):** seeded a real sale (Sourdough Loaf, stock 20→18) + 2 pending refund requests via the API → manager Approvals tray showed both cards (`Refunds 2`) → opened detail (reason/requester/amount + escalation explainer + grant-override CTA) → **Approve** the `damaged` one: `POST /bulk => 200`, request status → `approved`, `processReturn` executed (stock stayed 18 — correct: damaged goods are written off, not restocked), card vanished (`Refunds 1`) → **Decline** the `changed_mind` one: status → `declined`, no refund, `Refunds 0` empty state. Screenshot `h3-2d-approvals-tray.png`.

**Bugs found + fixed in Pass 3:**
- P3-3 (money path, caught in quality review): item could escape rollback if `markStatus` threw after `processReturn` (orphaned stock+sale) → push-to-succeeded reordered before markStatus. Silent partial-rollback → now surfaces `compensation_failures[]` in the 409. Duplicate-id in batch → now 400. Decline path had no existence/pending/vendor guards → could overwrite `approved` with `declined` → guarded. (+2 new tests; bulk suite 8/8.)
- P3-4 (caught LIVE): tray showed blank sale id + "Select undefined" because backend returns `original_sale_id` but the tray reads `sale_id` → mapped in `listPendingRefunds`.

**Verification:** pos vitest **228 green** (221 + 7 new approvals client tests), tsc 0. Backend: module test 2/2, `admin-approvals-refunds` 3/3, `admin-approvals-refunds-bulk` 8/8 (all individually). P3-3 got full two-stage review; others combined review; whole flow live-verified.

**DEFERRED (needs the design gate):** wiring the **cashier** refund flow (`RefundFlowPhone`/`RefundScreen`) to call `createRefundRequest` when a refund escalates, + the "refund request sent for approval" state on that cashier surface. New cashier-facing UI → [[feedback_design_first_gate]]. The backend create endpoint + `createRefundRequest` client helper already exist, so this is purely the cashier-side UI wiring. Do it as a separate design-gated step (after Pass 4). Test data left in `v_test`: 2 pending refund requests + 1 approved + 1 declined from prior runs.

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
