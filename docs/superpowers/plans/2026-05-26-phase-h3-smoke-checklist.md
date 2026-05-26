# Phase H-3 Smoke Checklist (manual, on real phone + desktop)

Run after subagent-driven-development finishes all H-3 tasks.

## Pre-flight

- [ ] `cd backend/apps/backend && npm run dev` — backend up at :9000
- [ ] `cd backend/apps/pos && npm run dev` — PoS up at :9200
- [ ] `cd backend/apps/admin && npm run dev` — Admin up at :9300
- [ ] All three apps tsc-clean: `npx tsc -b` in each directory
- [ ] Backend tests green:
  - `npm run test:integration:modules` (catalog_schema, ai/classify)
  - `npm run test:integration:http` (admin-catalog-schema, admin-catalog, admin-reports, admin-pos-terminal)
- [ ] PoS tests green: `cd backend/apps/pos && npm test` → 49/49
- [ ] Admin tests green: `cd backend/apps/admin && npm test` → 3/3

## H-2 cleanup verification

- [ ] PoS Settings → flip theme to Light → page background swaps immediately (was a no-op in H-2)
- [ ] Ring a sale offline, kill the tab while a row is in `sending` state (DevTools → Application → IndexedDB → hanoot-pos → sales_pending; close tab while status is `sending`); reopen — Dexie row is back to `queued` and drains on reconnect
- [ ] Verify wrong-PIN vs unknown-cashier-id response latency comparable (DevTools → Network tab; both should be ~50-200ms on a localhost run, not measurably different)

## Manager mode + Add product (PoS at :9200)

- [ ] Create a manager cashier via `POST /admin/pos-terminal/cashiers` with `role=manager` (use the Medusa admin curl or the existing admin UI)
- [ ] Navigate to `/manager` — cashier-login gate fires first if needed, then PIN gate appears
- [ ] PIN gate: pick a cashier whose role is `cashier` (not manager) → enter PIN → see "manager role required" error
- [ ] PIN gate: pick the manager cashier → enter PIN → admitted; ManagerLayout sidebar appears
- [ ] /manager/catalog shows the Dexie-cached catalog rows (0 rows if first run; click Refresh to sync from `/admin/pos-terminal/catalog-snapshot`)
- [ ] Add product manually (no barcode): /manager/catalog/new → click Grocery → fill Title + Price + Weight → Save → product appears in /manager/catalog after Refresh; visible in PoS register at `/` after refresh
- [ ] Add product via barcode lookup (real OpenFoodFacts code, e.g. `5740900401099`): paste in Barcode field → click Lookup → Title + image auto-fill from upstream; weight_grams populates if available
- [ ] (Optional) classifier picks Grocery (or Other if no OpenAI key set) — only fires if no category already picked
- [ ] Manual category override still works (click a different category after lookup)
- [ ] Required-field validation: try saving with title empty → see error
- [ ] (Optional) Camera scan path: `startCameraScan` helper exists in `src/hardware/camera-barcode.ts` but the v1 AddProductScreen UI does not yet have the camera button wired in. Phone test deferred until camera UI is mounted.

## CSV import (PoS at :9200/manager/import)

- [ ] /manager/import → upload a CSV with the documented header row → preview shows headers + first 5 rows
- [ ] Upload → backend processes; result panel shows total / created / failed counts
- [ ] Try a CSV with one bad row (e.g. missing title) → that row appears in the errors table with `{ row, reason }`; valid rows still create

## Admin dashboard (admin at :9300)

- [ ] Open http://localhost:9300 → redirected to /login
- [ ] Sign in with a Medusa admin user (created via `/auth/user/emailpass/register` workflow); enter a vendor_id you've seeded sales for
- [ ] Redirected to / (DashboardScreen)
- [ ] **SalesChart** shows the seeded sales from this session as a line over date buckets
- [ ] **TopSkusTable** lists the top SKUs ranked by revenue
- [ ] **AlertsPanel** — Drift section is empty in the happy path; Low stock lists items under threshold 5
- [ ] Date range picker on SalesChart changes the chart data when narrowed
- [ ] Sign out button clears session and returns to /login

## Speed-bar spot checks (stopwatch)

- [ ] Barcode lookup roundtrip < 800ms on broadband
- [ ] Schema form renders < 100ms after category click (DevTools Performance)
- [ ] CSV with 1,000 rows finishes < 30s
- [ ] Manager PIN verify < 300ms

## Regression

- [ ] PoS register (`/`) still rings sales as before (HID barcode → cart → charge)
- [ ] PoS cashier login (LoginScreen) still works
- [ ] Existing pos_terminal integration tests still pass: `npm run test:integration:pos-terminal:http`
- [ ] wms drift detection still passes: `npm run test:integration:wms`

## Known v1 limitations (acknowledged, deferred)

- Camera scan UI button not wired into AddProductScreen yet — the helper exists, the page-level button is a v1.1 add
- Image upload is URL-only (no file picker → S3 path)
- Admin login does not auto-pick vendor_id from the signed-in user's tenant scope — manual entry for now
- Recharts width=0 warnings in jsdom test output are noise (no layout engine in jsdom); production renders are fine
- PWA install on the admin app is not configured (intentionally — desktop-only browser use)
