# Phase H-1 (Backbone-WMS) — In-progress checkpoint

**Started:** 2026-05-25 via subagent-driven-development skill.
**Plan:** [`2026-05-25-phase-h1-backbone-wms.md`](./2026-05-25-phase-h1-backbone-wms.md)

## Tasks complete

| Task | Status | Commit | Notes |
|---|---|---|---|
| Task 0 (verify foundation) | ✅ | (no commit — verification only) | Medusa v2.15.2, Postgres on :5433 (NOT :5432), Jest configured. Existing `pos/` module is unrelated (external-PoS-adapter pattern). |
| Task 1 (scaffold WMS module) | ✅ | `0abd82e` | Module loads, `ping()` returns `wms-ok`. |
| Task 2 (stock pool model + migration) | ✅ | `81239a4` | Table + unique-index live. 2 model tests green. |

Path-fix commit `7ddada1` (corrects `backend/apps/api/` → `backend/apps/backend/` throughout the plan).

## Carry-forward learnings (apply to every remaining task)

The plan was written generically; actual Medusa v2 in this codebase has specifics that subsequent task subagents MUST be told. Carry these into every dispatch:

### Constants & paths
- Project root: `D:\Personal\08_Ecommerce app\ecommerce-mvp\`
- Backend dir: `backend/apps/backend/` (NOT `backend/apps/api/`)
- Test Postgres on **:5433** with data dir `D:/Personal/08_Ecommerce app/ecommerce-mvp/local-pg-data`. If down: `pg_ctl -D <data-dir> start`.
- `WMS_MODULE = "wmsService"` (the module name is the *service-accessor* name in Medusa v2; this codebase resolves modules by that key).

### Code patterns this codebase uses
1. **Model registration** — done in `service.ts` via `class WmsService extends MedusaService({StockPool, Movement, Reservation, ShopLocation}) { ... }`. The `Module()` factory in `index.ts` only takes the service. **DO NOT add a `models:` array to `Module()`** — no module in the codebase uses that shape.
2. **Auto-generated CRUD** — `MedusaService({Foo})` auto-generates `createFoos(...)`, `listFoos(...)`, `updateFoos(...)`, `deleteFoos(...)`, `retrieveFoo(...)`. Use these for normal CRUD. Don't hand-roll repository methods for simple inserts/selects.
3. **`model.bigNumber()` generates DUAL columns** — `<col>` (NUMERIC) plus `raw_<col>` (JSONB NOT NULL). Migrations must create both. Reference `merch_category` migration for the pattern.
4. **Auto-managed timestamps** — `created_at`, `updated_at`, `deleted_at` are added implicitly by `MedusaService`. Migrations need to create all three columns even if the model doesn't list them.
5. **Soft-delete-aware indexes** — Indexes should be partial with `WHERE deleted_at IS NULL`. Index naming: `IDX_<table>_<field>` for regular, `uniq_<custom_name>` for unique.
6. **Migration import** — `import { Migration } from '@medusajs/framework/mikro-orm/migrations'` (NOT `@mikro-orm/migrations`).
7. **Raw SQL access for atomic operations** — `MedusaService` extends provide `this.activeManager_` or via DI the `manager` token is not always resolvable. For row-level locking (Task 5 atomic decrement), use the module's `__container__` to resolve the Mikro-ORM EntityManager, or run raw SQL via the Awilix-resolved `__dbConnection__`. **Reference the merch module if any of its methods do raw SQL** — that's the canonical pattern in this codebase.

### Test patterns
- `medusaIntegrationTestRunner` is the canonical wrapper.
- Don't use `container.resolve('manager')` for raw SQL — it doesn't resolve in this setup. Prefer auto-generated CRUD methods. For tests that NEED raw SQL (concurrency, e2e), look at how merch module tests do it.
- Tests run with `NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/wms/...`.
- Medusa wraps PG unique violations as `"<Model> with <field>: <val>, ... already exists."` — regex test assertions should match `/unique|duplicate|already exists/i`.
- Bonus: there's no `test:integration:wms` npm script yet. Add one in Task 18 (final commit) if convenient.

## Tasks remaining (16)

| # | Task | Risk level |
|---|---|---|
| 3 | Repository + service.getStock | low |
| 4 | Movement model + migration | low |
| 5 | **Atomic decrement** with row-level locking | **high** — needs raw SQL access |
| 6 | Increment / restock | low |
| 7 | Reservation model + migration | low |
| 8 | createReservation with OOS guard | medium |
| 9 | consume/release reservation | medium |
| 10 | Reservation expiry (lazy + scheduled) | medium |
| 11 | Concurrency tests (100-thread race) | **high** — verifies Task 5 |
| 12 | Shop location + Haversine geo | medium |
| 13 | Event emissions | low |
| 14 | Drift detection job | low |
| 15 | Admin REST API | low |
| 16 | Store REST API | low |
| 17 | E2E order-loop scenario | low |
| 18 | Suite + tag | low |

## Resume instructions for next session

1. Read this checkpoint doc first.
2. Read the plan at `2026-05-25-phase-h1-backbone-wms.md`.
3. Apply the **carry-forward learnings** above to every subagent dispatch.
4. Start with Task 3 — it's a low-risk continuation.
5. Tasks 5 + 11 (atomic decrement + concurrency) are the gates. Block on these if anything is unclear; correctness > completion. Inspect how an existing module like `merch` or `payments` accesses the EM/DB for atomic operations before dispatching Task 5.

## Why I checkpointed mid-phase

This session was used heavily for:
- Brainstorming + writing the master vision doc (`fda3302`/`3586fe1`)
- Writing the H-1 plan (`c2e2053`)
- Path-fix (`7ddada1`)
- Tasks 1-2 (`0abd82e`, `81239a4`)

Phase H-1 was scoped at 2-3 weeks of focused work. Realistic per-task duration with subagent + adaptation = 30-60 min. 16 tasks remain = 8-16 hours of subagent work. Better to checkpoint clean than to risk context truncation mid-task.
