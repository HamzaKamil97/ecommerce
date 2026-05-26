# Hanoot Platform — Process Rules

These are durable rules every Claude session working on this project must follow. They override default behaviour and don't expire.

---

## Rule 1 — Design-First Gate (mandatory)

**Every user-facing UI surface goes through `frontend-design` BEFORE any implementation code is written.**

### When this rule applies

- A new screen
- A redesigned screen
- A new visible component (anything the customer / cashier / vendor / picker / rider / admin sees)
- "Small" UI changes that ship to users

### When this rule does NOT apply

- Pure backend work (services, modules, migrations, jobs)
- Bug fixes to already-approved surfaces
- Internal admin scripts no customer sees

### The flow

```
1. Brainstorm / requirements gathered
        ↓
2. Invoke `frontend-design` skill
        ↓
3. Skill produces visual mockups (HTML / sketches / images)
        ↓
4. USER REVIEWS the mockups visually
        ↓
5. User approves OR requests changes (loop until approved)
        ↓
6. THEN invoke writing-plans for the implementation plan
        ↓
7. THEN invoke subagent-driven-development to execute
```

The user must SEE the design before code is written. No exceptions.

### Reference apps (cite in every design brief)

- **Loyverse** — PoS UX gold standard (consistent UI across mobile / PC / dashboard)
- **InstaShop** — primary multi-vertical super-app reference
- **Talabat** — MENA delivery / cart patterns
- **Toters** — Iraqi / Lebanese precedent

---

## Rule 2 — Phases ship sequentially, not in parallel

Per the Hanoot platform vision (`docs/superpowers/specs/2026-05-25-hanoot-platform-vision.md`):

- One chat per **plan** (not per phase — a big phase like H-3 may have 5 sub-plans, that's 5 chats)
- Don't run two chats on the same task
- Sequential is the default; parallel only when phases touch different folders AND don't depend on each other

---

## Rule 3 — Carry-forward learnings flow into every new plan

Every implementation plan must include a "Pre-existing context the executor MUST know" section listing:
- Backend path (`backend/apps/backend/`)
- Test Postgres port (`:5433`)
- Module naming (`pos_terminal` not `pos` — `pos` is the existing external-PoS-adapter)
- BigNumber dual-column gotcha (NUMERIC + `raw_<col>` JSONB)
- Raw SQL access: `(this as any).__container__[ContainerRegistrationKeys.PG_CONNECTION]` → `knex` → `pg.transaction(async trx => trx.raw(...))`
- Test command shape: `TEST_TYPE=integration:* NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit <path>`
- Migration import: `@medusajs/framework/mikro-orm/migrations`
- Stale `.js` files in apps shadow `.tsx` — delete with `find ... -name '*.js' -delete` if Vite resolves wrong file

---

## Rule 4 — Every-button gate

A feature isn't done until every interactive element has been clicked and works. Backend equivalent: every public service method has at least one passing integration test.

Established 2026-05-20 in [`feedback_completion_over_velocity_2026-05-20.md`](../../).

---

## Rule 5 — Local validation before any deploy

Before pushing to Hostinger / production:
- All tests green locally
- Manual smoke checklist run if real hardware involved (e.g., barcode scanner, thermal printer)
- `npx tsc --noEmit` clean

Established 2026-05-18 after 9 deploy bugs from skipping local validation.

---

## Quick reference for "what to do when starting a new session"

1. **Read memory** — `~/.claude/projects/d--Personal-08-Ecommerce-app/memory/MEMORY.md` (auto-loaded)
2. **Read the current phase plan** — `docs/superpowers/plans/<latest>.md`
3. **Read the progress checkpoint** if mid-phase — `docs/superpowers/plans/<phase>-progress.md`
4. **Apply Rule 1 (Design-First Gate)** for any UI work in scope
5. Dispatch as needed.
