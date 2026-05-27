# Phase H-3.2b Cashier Surfaces — Progress

**Status:** complete · 2026-05-27
**Branch:** `phase-h3-2b-cashier-surfaces` · tag `phase-h3-2b-cashier-surfaces-complete`
**Commits:** 23 ahead of `phase-h3-2a-foundation`

## Tests

| Suite | Status | Note |
|---|---|---|
| Backend module integration (`cash_session`, `inventory_count`, `online_order`, `pos_terminal/process-return`, `audit_log`) | **24/24** | Run batched together — passes |
| Backend HTTP integration (`pos-cash-session`, `pos-inventory-count`, `pos-online-orders`, `pos-refunds`, `audit-log-middleware`, `permission-middleware`) | **24/24** when run individually | Batched-run fails on Medusa-test-runner container conflict (each spec spins its own Medusa app and they collide). Known limitation — not a regression. |
| PoS Vitest (`tests/**/*.test.{ts,tsx}`) | **153/153** | 41 test files. +73 from H-3.2a baseline (80/80) |
| Admin Vitest | **7/7** | Unchanged |
| TypeScript | **0 errors in pos**, baseline 3 in backend | Same as H-3.2a baseline |

## What shipped

### Section A — Backend (10 commits)

- `be85d8f` Wire audit middleware for /pos/* mutating routes
- `d06fbdd` cash_session module (5 cases)
- `b00f6fb` /pos/cash-session/{open,close,current} routes (4 cases)
- `c9afb53` inventory_count module (5 cases)
- `cc86ed7` /pos/inventory-count routes + apply gate (4 cases)
- `a96ed6c` **fix**: audit vendor attribution via `req.audit_context` + inventory_count partial-failure breadcrumb
- `3773e31` online_order skeleton module (6 cases)
- `59bf433` /pos/online-orders routes (6 cases)
- `be80852` pos_terminal.processReturn() + /pos/refunds with PIN gate (3 module + 6 HTTP cases)
- `685d012` **fix**: refund idempotency (client_id pre-check) + name_snapshot lookup + stock-first ordering matching recordSale's compensation pattern (8 HTTP cases incl. I1+I2 follow-ups)

### Section B — Frontend infrastructure (4 commits)

- `ea0ea20` theme store + auto-dark at 18:00 (8 tests)
- `cf2ab3d` useResponsive hook (8 tests)
- `c6ffc19` 5 API clients (cashSession/refunds/onlineOrders/inventoryCount/alerts) + apiPatch/apiDelete helpers
- `af9d548` 5 shared components (CashierAlertPanel/ScanZone/DenominationGrid/BottomTabBar/PhoneFrame) (15 tests across 4 test files)

### Section C — Cashier UI screens (9 commits)

- `ef01204` RegisterScreen v2 — responsive tablet/phone, conditional DOM by `useResponsive`, CartList reskinned with `compact` prop (6 tests)
- `fd5654f` PaymentScreen v2 — dark keypad, quick-cash chips, live change calc (6 tests)
- `b2bff4c` SettingsScreen v2 — theme picker + hardware chips + ops toggles (6 tests)
- `e8743fa` OrderInboxScreen — 3 tabs, urgency cards, inline accept/reject (5 tests)
- `5785a68` OrderDetailScreen — customer + pick-list + map + voice-note + handoff (6 tests)
- `e21581c` RefundFlowPhone + RefundScreen tablet — shared `useRefundState` hook (4 tests)
- `865cb37` EndOfDayScreen — vitals + denoms + live diff + close till (5 tests)
- `257bd86` StockCountScreen — scope picker + scan + reasons + apply (4 tests)
- `879b802` C10 wiring — routes for /orders, /orders/:id, /refund, /end-of-day, /stock-count; App.tsx auto-dark interval; RegisterScreen bell wired to CashierAlertPanel with 30s polling

## Key architectural decisions locked

- **Permission gates** are CENTRAL matchers in `backend/apps/backend/src/api/middlewares.ts`, not per-route exports. Routes touching money/stock cross a permission matcher; route file stays clean.
- **Audit attribution** uses an opt-in `(req as any).audit_context = { vendor_id }` pattern. Multi-step routes (close, addLine, apply, accept, reject, partial, handoff) look up the session/order and set this before calling the service, so the audit middleware can attribute the row to the correct vendor even when the request body doesn't carry `vendor_id`.
- **wms integration**: A4 implementer discovered wms exposes `incrementStock`/`decrementStock` (positive qty only, distinct methods) rather than the planned `adjustOnHand`. Adapted across `inventory_count.applyCount` and `pos_terminal.processReturn` using sign-dispatch with `MovementType: 'adjustment'` (counts) / `'restock'` (refunds).
- **Refund money path** mirrors `recordSale` exactly: raw-SQL pre-check for idempotency, stock-first ordering, three-stage compensation (wms-loop catch → createSales catch → createSaleLines catch). Refund line `name_snapshot` looked up from original sale line for receipt clarity.
- **Responsive UI strategy**: conditional DOM rendering (not CSS hiding) via `useResponsive().isPhone`. Phone variants entirely omit the desktop-only panes. Same screen component, two branches.
- **Theme store**: dark/light + auto-dark at 18:00. `applyTheme` writes `data-theme` to `documentElement`; `tokens.css` selects on `[data-theme='dark']` to invert the palette. C10 wires a 60s interval to evaluate auto-dark.
- **Stale `.js` files** in `apps/pos/src/` periodically shadow `.tsx` after refactors. Each C-screen rewrite deleted the stale shadow as part of the commit.

## Carried-forward gotchas for future phases

- HTTP integration suites must be run **individually**, not batched in one Jest invocation. Each spec calls `medusaIntegrationTestRunner` which spins up a Medusa app, and concurrent app boots collide. CI should run them as separate jobs or sequential `npm` scripts.
- `pos_terminal` does NOT have an explicit `dependencies: ['wmsService']` declaration in `medusa-config.ts` — but A4 discovered new modules that cross-call wms via `(this as any).__container__['wmsService']` DO need it (added retroactively to `inventory_count`). New cross-module-calling modules MUST declare deps in medusa-config.
- IQD `total_minor` is whole dinars in this codebase (no fractional minor units), but the `_minor` naming is preserved for consistency.
- `Audio` API mocks needed in pos test `beforeEach` for screens that play beep/error.wav.

## Visual contract

Mockup index: [docs/mockups/h3-2b/index.html](../../mockups/h3-2b/index.html) — 13 standalone HTML files, one per surface. Captured screenshot at [docs/superpowers/h3-2b-smoke/00-index.png](../h3-2b-smoke/00-index.png).

LoginScreen render (dev server boot proof): [docs/superpowers/h3-2b-smoke/c1-loginscreen-1280.png](../h3-2b-smoke/c1-loginscreen-1280.png).

Full per-surface Playwright walkthrough requires the Medusa backend running for PIN verification. Deferred to a real-deploy smoke pass; current acceptance relies on Vitest verifying React structure + visual mockups locking the contract.

## Out of scope (deferred to later sub-phases)

- `report_definition`, `promotion`, receipt-designer schema → H-3.2d (admin)
- `notification_prefs` UI → H-3.2d
- `/pos/alerts` backend route → next phase (the API client gracefully degrades on 404 today)
- `/pos/sales/:id` cashier-side lookup → next phase (refund flow uses a stub today)
- Per-vendor scoped auth tokens (H-3.1 OPEN #1)
- Picker app (Phase J)
- Customer-facing changes
- Voice-add for catalog entry
- Card payment integration (COD only per vision doc)
- Tax engine
