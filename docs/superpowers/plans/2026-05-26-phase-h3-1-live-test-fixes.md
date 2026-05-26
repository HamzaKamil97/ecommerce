# Phase H-3.1 — Live Browser Test Findings & Follow-Up Fixes

> **Status:** Documents 9 bugs found during the first end-to-end browser smoke test of H-3 (2026-05-26). 4 dev-unblock fixes were applied inline so testing could continue; 5 remain open. Each open bug has a proposed fix below.

**Why this exists:** H-3 shipped with 49+3 frontend tests + 28 backend integration tests all green, then failed on every step of a real browser smoke test until the dev-unblock fixes landed. The plan's smoke checklist would have caught most of these; it was written but not executed before declaring H-3 done. This document is the audit trail and the H-3.1 task list.

---

## Bugs found in the live test

### Inline fixes applied during testing (committed in this branch)

#### Bug #1 — Backend `.env` ADMIN_CORS/AUTH_CORS/STORE_CORS missing `:9200` and `:9300` — FIXED
- **Symptom:** Both browser apps blocked by CORS preflight. PoS shows empty cashier list; admin login `Failed to fetch`.
- **Root cause:** H-2 added the PoS at `:9200`, H-3 added the admin at `:9300`, neither updated the backend's CORS allowlists.
- **Fix applied:** Local `.env` updated. `.env.template` (tracked) updated with explanatory comments.
- **Why tests missed it:** Integration tests call routes in-process; no browser preflight occurs.

#### Bug #2 — PoS `api/client.ts` had no admin auth header — FIXED (dev shim)
- **Symptom:** Every call to `/admin/pos-terminal/*` and `/admin/catalog*` returned 401.
- **Root cause:** The H-3 plan acknowledged this as a known open item ("deferred — manager PIN gate replaces it") but the manager PIN gate ALSO calls admin routes. The deferral was incorrect.
- **Fix applied:** Added `src/api/dev-auth.ts` — memoized fetch of an admin JWT using `VITE_DEV_ADMIN_EMAIL`/`VITE_DEV_ADMIN_PASSWORD` from `.env`. `api()` wrapper awaits the token and attaches `Authorization: Bearer ...`. Skips in test mode (`import.meta.env.MODE === 'test'`) to avoid leaking into the fetch-spy count.
- **Why tests missed it:** Vitest tests mock `fetch` or use `vi.mock` on the api module; they never exercise the real network path.
- **DEBT:** This is a dev shim, not a production auth model. See **OPEN #1** below for the proper fix.

#### Bug #3 — No `.env` files for `apps/pos/` or `apps/admin/` — FIXED
- **Symptom:** `VITE_VENDOR_ID` defaulted to empty string; cashier list and admin queries hit the backend with `vendor_id=`.
- **Fix applied:** Created `.env` files in both apps. `.env.example` written in each so future devs can copy-and-go.

#### Bug #5 — `LoginScreen.tsx` bypassed the `api()` wrapper — FIXED
- **Symptom:** Cashier PIN verify returns 401 — no auth header on the raw `fetch` call. "Bad PIN — try again" shown for every PIN attempt (correct PINs included).
- **Root cause:** `LoginScreen.submit()` called `fetch(\`${API_BASE}/admin/pos-terminal/cashiers/verify\`)` directly, bypassing the `api()` wrapper that adds auth. Pre-existed in H-2 — but H-2's cashier login was never browser-tested either; the H-2 plan only ran integration tests.
- **Fix applied:** `LoginScreen` now uses `verifyCashierPin` helper (added in Task 3.2) which goes through `api()`.

#### Bug #6 — Stale `tsc -b`-emitted `.js` files in `src/` shadow `.tsx` sources — WORKED AROUND
- **Symptom:** Edits to `.tsx` files have no effect; Vite serves the old `.js` versions.
- **Root cause:** H-2 set up `npm run build` as `tsc -b && vite build`. `tsc -b` emits `.js` next to `.tsx` because the tsconfig has no `outDir`. Vite's module resolver prefers `.js` over `.tsx` (per its default `resolve.extensions` order). The implementer for Tasks 0.2 and 3.5-3.8 hit this and deleted the files inline. They got re-emitted on the next `npm run build` or test run.
- **Fix applied:** Deleted all 39 stale `.js`/`.js.map`/`.d.ts` files in `pos/src/`. Restored the intentional `pwa/virtual-pwa.d.ts`.
- **DEBT:** Re-emerges on every test or build. See **OPEN #2** below for the proper fix (tsconfig `outDir` to a build-only directory).

#### Bug #8 — H-3 catalog_schema migration never applied to dev DB — FIXED
- **Symptom:** `/admin/catalog-schema/categories` returned 500 with `42P01 relation does not exist`. AddProduct screen showed no category buttons.
- **Root cause:** Medusa migrations don't auto-run on `medusa develop`. The H-3 smoke checklist didn't say "run `npx medusa db:migrate`" because the test runner auto-runs migrations and the plan author was thinking from that frame.
- **Fix applied:** Ran `npx medusa db:migrate` — migration `Migration20260526100001` applied + 6 verticals seeded.
- **DEBT:** Smoke checklist needs an explicit step. See **OPEN #5** below.

---

### Bugs still open (proposed fixes for H-3.1)

#### OPEN #1 — Replace the dev-auth shim with a real per-vendor auth model
**Priority:** P0 — blocking real-vendor onboarding. Must land before any production deploy.

**Problem:** Today the PoS browser holds the Medusa super-admin token. Anyone with PoS access can read/write every vendor's data. The cashier-PIN gate is a UX gate, not a security boundary.

**Proposed fix:**
1. New backend module `vendor_terminal_auth/` issues per-vendor JWTs scoped to one `vendor_id` and `role`. Route: `POST /vendor-terminal/auth` (body: vendor_id + provisioning_secret OR vendor_id + cashier_id + pin) → returns a short-TTL token whose claims include `{vendor_id, terminal_id, role}`.
2. Medusa middleware that, when the request hits a `/vendor-terminal/*` route, decodes the token and rejects if `body.vendor_id !== claims.vendor_id` or if the role is insufficient.
3. New `/vendor-terminal/*` route family that mirrors the necessary subset of `/admin/pos-terminal/*` and `/admin/catalog/*`, but vendor-scoped instead of admin.
4. PoS removes the dev-auth shim, uses the new token instead. Terminal-provisioning flow: super-admin generates a one-time `provisioning_secret` per terminal; first-launch PoS exchanges it for a long-lived terminal credential stored in IndexedDB.

**Tests:** vendor A's token rejected when calling vendor B's routes; cashier-role token rejected on /catalog-schema writes; manager-role admitted; ring-sale flow works against the new route surface.

**Effort estimate:** 1 phase (~3-4 weeks). This is its own design problem — not a quick fix.

#### OPEN #2 — tsc-emitted `.js` files in `src/` shadow `.tsx` sources
**Priority:** P1 — recurring papercut, costs ~20 minutes every time it bites.

**Problem:** Recurring infrastructure issue documented in 4 separate subagent reports during H-3 execution. Each `npm run build` or sometimes `npm test` regenerates `.js` files in `src/`.

**Proposed fix:** Update `backend/apps/pos/tsconfig.json` and `backend/apps/admin/tsconfig.json` to add:
```json
"outDir": "./dist-tsc",
"rootDir": "./src",
"noEmit": true   // for the test/dev config; remove for the build config if separate
```
And add a `.gitignore` entry for `dist-tsc/`. Or: switch `npm run build` to `vite build` only (drop `tsc -b`) and rely on Vite's TypeScript transpilation + `tsc --noEmit` for type-checking. Vitest already type-checks via `@vitest/coverage-v8` or similar.

**Tests:** edit a `.tsx`, run `npm test`, run `npm run build`, edit `.tsx` again — second edit should still be hot-reloaded by `npm run dev`.

**Effort estimate:** 1-2 hours.

#### OPEN #3 — Cashier session is memory-only; lost on every page reload
**Priority:** P2 — terrible UX, but workable for v1 single-vendor pilot.

**Problem:** `useSession` and `useManagerSession` are Zustand stores with no persistence. Every reload (or accidental tab close) requires re-login. Tested live: navigating from `/` to `/manager` wiped the cashier session even when no F5 happened, because react-router's createBrowserRouter does a hard navigation when route changes substantially.

Wait — re-check: `createBrowserRouter` should NOT do hard navigations. Navigating to `/manager` should preserve in-memory Zustand state because React doesn't re-mount. The fact that it DID get wiped suggests something else — maybe the Vite HMR triggered a full reload because `App.tsx` was edited mid-session. Need to confirm whether this is reproducible without an HMR event in the middle.

**Proposed fix:**
1. Confirm reproduction in a clean session (no HMR mid-flight): log in as Ali, click around for 30 seconds, then navigate via `<Link to="/manager">` — does session persist?
2. If session DOES persist normally, document as known-quirk-during-dev only.
3. If session does NOT persist, add `zustand/middleware persist` to both `useSession` and `useManagerSession` with `sessionStorage` (NOT `localStorage` — sessions should die when tab closes, manager re-PIN required).

**Tests:** sign in as cashier → reload → still signed in as cashier. PIN-gate manager → reload → still in manager mode for the same tab session. Close tab → reopen → cashier needs to re-login (sessionStorage cleared).

**Effort estimate:** 1 hour confirm + ~2 hours fix if needed.

#### OPEN #4 — Product create routes don't persist prices (`price_minor` always reads 0)
**Priority:** P1 — blocks rings-with-real-prices and breaks reports revenue.

**Problem:** Both `/admin/catalog/products` and `/admin/catalog/import-csv` create products with `variants: [{prices: [{amount, currency_code}]}]`. The product writes; the price doesn't.

**Verified live:** Lurpak created with `price_minor=4500`. Catalog-snapshot returns it as `price_minor: 0`. Same for 4 CSV-imported products. Ring sale with the product → recorded sale's `total_minor` is 0 → admin TopSKUs shows "0.00k" revenue.

**Root cause hypothesis:** Medusa v2 manages variant prices through a separate `pricing` module / price-set workflow (`createPriceSetsWorkflow`, `addPriceListPricesWorkflow`, etc.) rather than via the inline `prices` array on `createProducts`. The inline `prices` may silently no-op in v2.

**Proposed fix:**
1. Investigate: read `node_modules/@medusajs/medusa/dist/modules/pricing/...` and the existing `vendor/products/route.ts` (which DOES use `prices: []` — does it actually work?). Possibly `vendor/products/route.ts` is also broken; it was H-1 work that may have never been verified end-to-end.
2. Replace `prices: []` with an explicit price-set creation via the pricing module service.
3. Backfill: write a one-shot script that updates the 5 products created today with correct prices.
4. Add an integration test that:
   - creates a product with `price_minor: 4500`
   - GETs catalog-snapshot
   - asserts `items[0].price_minor === 4500`
   This test would have caught the bug immediately.

**Tests:** see step 4 above.

**Effort estimate:** 4-8 hours (investigation + fix + test + backfill).

#### OPEN #5 — H-3 smoke checklist needs explicit DB migration step
**Priority:** P3 — one-line doc fix.

**Problem:** The smoke checklist's Pre-flight section says "backend up at :9000" but assumes migrations are already applied. New devs and prod-bootstraps will hit Bug #8.

**Proposed fix:** Add to `docs/superpowers/plans/2026-05-26-phase-h3-smoke-checklist.md`:
```
- [ ] **One-time:** apply pending migrations: `cd backend/apps/backend && npx medusa db:migrate`
```
Place this before the "start the dev servers" steps. Same fix in any future phase plan that adds a new module with a migration.

**Effort estimate:** 5 minutes.

#### OPEN #6 — Quick-buttons / SettingsScreen don't auto-refresh after Refresh catalog
**Priority:** P3 — already listed in the H-2 done memory as a known minor.

**Problem:** SettingsScreen `useEffect(() => { db.catalog.toArray().then(setVariants); }, [])` runs once on mount. Clicking Refresh updates Dexie but doesn't update the SettingsScreen's local state. User has to close and reopen Settings.

**Proposed fix:** In `SettingsScreen.tsx`, change Refresh handler to also call `setVariants(await db.catalog.toArray())` after `syncCatalog`. Or use Dexie's `useLiveQuery` hook for both `cfg` and `variants`.

**Effort estimate:** 30 minutes.

#### OPEN #7 — Manager PIN-gate cashier list doesn't filter by role
**Priority:** P3 — cosmetic/UX.

**Problem:** `ManagerPinGate.tsx:46` has `cashiers.filter((c) => c.role === 'manager' || true)` — the `|| true` makes the filter a no-op. All cashiers are shown in the manager-mode picker; cashier-role users only get the rejection AFTER entering their PIN. Mildly misleading UX.

**Proposed fix:** Remove the `|| true`. Show only manager-role cashiers in the picker. If the list is empty, show "No managers configured — ask an admin to create one."

**Effort estimate:** 5 minutes + 1 unit test.

#### OPEN #8 — `manifest.webmanifest` syntax error in PoS PWA
**Priority:** P3 — console noise; PWA install probably broken.

**Problem:** Chrome logs `Manifest: Line: 1, column: 1, Syntax error.` on every PoS page load. The file IS served (200 OK), but parsing fails.

**Proposed fix:** Inspect `backend/apps/pos/public/manifest.webmanifest` or the generated output. Likely missing JSON content-type header or has a BOM. Fix the generation step in `vite.config.ts` PWA plugin.

**Effort estimate:** 30 minutes.

#### OPEN #9 — Initial-on-hand isn't validated against the BackendVariant's existence guard
**Priority:** P2 — partial: this is half-covered by the final-review variant-guard fix landed earlier.

**Problem:** The final-review fix added `if (!p?.variants?.[0]?.id) ...` guard in `/admin/catalog/products` and `/admin/catalog/import-csv`. Good. But the existing live test showed all variant_ids DO exist, so the guard never fired — Bug #4 (price=0) is the real failure mode in practice.

**Action:** Marked closed by the final-review fix; verify no further work needed once Bug #4 is fixed.

---

## Test infrastructure observations

These aren't bugs per se but should inform H-3.1 and beyond.

1. **No end-to-end test harness exists.** Vitest+jsdom and Medusa's in-process integration runner are both useful but neither catches CORS, real auth, or Vite resolution issues. Phase H-3.1 should add a Playwright smoke harness that boots backend + pos + admin and runs the smoke checklist in CI.

2. **Smoke checklists are unmaintained doc — until they're run, they don't catch anything.** The H-3 smoke checklist was written but never executed before the user asked me to. The bugs above were latent in main for hours. Either: automate the checklist (Playwright), or add an explicit "smoke-run" gate to the phase-done definition.

3. **Per-task code review missed Bug #5.** A spec/quality reviewer looked at the H-3 PoS diff and didn't notice that `LoginScreen.tsx` (untouched by H-3 but adjacent) had a raw-fetch call. Cross-cutting bugs need a separate review pass focused on "what code paths exist in production that the new code touches indirectly." Schedule one such pass at end-of-phase.

4. **Test mocking hid real fetch behavior.** The pos test suite uses `vi.mock` extensively, which is correct for unit tests but means no test ever sees what the api wrapper REALLY does. Add at least one "thin" end-to-end test that doesn't mock fetch — talks to a stubbed backend (msw or similar).

---

## Suggested execution plan for H-3.1

| Day | Task | Effort |
|---|---|---|
| 1 | OPEN #5 (smoke checklist doc), OPEN #7 (PIN gate filter), OPEN #6 (Settings refresh), OPEN #8 (manifest) | 1.5 hours total |
| 2 | OPEN #2 (tsconfig outDir fix) | 2 hours |
| 3 | OPEN #4 (prices investigation + fix + backfill + test) | 4-8 hours |
| 4-5 | OPEN #3 (session persistence — confirm reproduction first) | 3 hours |
| Week 2 | OPEN #1 (real vendor auth model design + implement) | 1 full week |
| Week 2-end | Playwright smoke harness in CI (re-use what was learned in this live test) | 1 day |

After H-3.1: H-3 is genuinely shippable. Without it, "shipped 2026-05-26" was aspirational — the system was unrunnable in a browser until the dev-unblock fixes applied during this live test.

---

## Live test artifacts (this session)

- Screenshots: `./test-2-settings-dark.png`, `./test-3-light-theme.png`, `./test-4-admin-dashboard.png`, `./test-5-final-dashboard.png`
- Commits applied during testing (will land in this PR):
  - `chore(backend): add :9200 + :9300 to CORS allowlists`
  - `feat(pos): dev-mode admin auth shim via VITE_DEV_ADMIN_* env`
  - `fix(pos): LoginScreen uses verifyCashierPin via api() wrapper`
  - `docs(backend,pos,admin): .env.example/.env.template updates`
