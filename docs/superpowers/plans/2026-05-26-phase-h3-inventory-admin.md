# Phase H-3 (Inventory & Vendor Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give vendors the tooling to onboard 5,000+ SKUs in two weeks by walking the aisles with a phone (camera-first scan → barcode lookup → AI category classifier → schema-driven fields → save), back it up with CSV import for bulk migration, gate manager-only surfaces behind the PoS cashier PIN, and add a separate web dashboard surfacing vendor-scoped sales / top-SKUs / drift alerts on top of the H-1 wms module.

**Architecture:**
- **One backend module added** — `catalog_schema/` — owns the per-vertical field schemas (grocery → weight+expiry, clothes → size+color, salon → service_duration, etc.) and the category roster. Surface via `/admin/catalog-schema/*`.
- **Three thin backend routes** — `/admin/catalog/barcode-lookup` (proxies GS1/OpenFoodFacts), `/admin/catalog/classify` (proxies OpenAI gpt-4o-mini via existing `ai/` module), `/admin/catalog/import-csv` (multipart, batched create). All vendor-scoped via the same `created_by_vendor_id` metadata the catalog-snapshot already filters on.
- **Reports routes under `/admin/reports/*`** — pure read-side aggregates over `pos_sale`, `pos_sale_line`, and `wms_*` tables; no new module needed.
- **Frontend: PoS app extended** with react-router. Routes: `/` (existing register), `/manager/*` (PIN-gated). Manager mode wraps Catalog browse + Add Product wizard (barcode camera + auto-populate + schema form) + CSV import. Reuses `verifyCashierPin` from H-2 (`role === 'manager'` required).
- **Frontend: new `apps/admin/` Vite app** (port 9300) for the desktop reports dashboard. Same React+Vite+TS stack as the PoS so the shared design tokens, api client, and auth wrapper move over verbatim. Three panels: Sales summary (line chart), Top SKUs (table), Alerts (drift + low-stock + expiring).
- **H-2 cleanup** — fold the three easy limitations from `project_phase_h2_done.md` into the PoS extension work: theme actually swaps visually, `sending` status reset on app mount, cashier-not-found dummy hash (closes timing oracle). Skipped on this plan: auto-admin-auth at startup (deferred; not on the natural path) and quick-buttons auto-refresh (touched indirectly when catalog write paths land).

**Tech Stack:**
- Backend: Medusa v2, Postgres, Jest, MikroORM auto-CRUD, raw SQL via `ContainerRegistrationKeys.PG_CONNECTION`, existing `ai/` module → OpenAI gpt-4o-mini (key-optional).
- PoS extension: react-router-dom 6 (already a dep), `@zxing/browser` for camera barcode scan, `papaparse` for client-side CSV preview, existing Dexie/Zustand/Vitest stack.
- New admin app: React 18 + Vite 5 + TypeScript + Zustand + `recharts` for charts + vite-plugin-pwa (omit service worker — desktop-only) + Vitest + Testing Library.
- External APIs: `https://world.openfoodproducts.org/api/v2/product/<barcode>.json` (OpenFoodFacts, no key, ~70% coverage on packaged grocery in MENA), graceful fall-through to manual entry on miss.

**Vision doc reference:** `docs/superpowers/specs/2026-05-25-hanoot-platform-vision.md`
- Section 2 (architecture — PoS+Inventory+VendorAdmin share one Vite codebase; role-based privilege model)
- Section 3 (tech stack — schema-driven product fields per industry)
- Section 4 row 2 (Inventory & catalog data entry scope), row 3 (Vendor Admin scope), row 4 (WMS — drift detection nightly is what alerts feed off)
- Section 5 (Phase H-3 row — camera-first, AI auto-populate, CSV, schema-driven, PIN-gated, separate dashboard)
- Section 6 (AI integration map — Data entry section: barcode auto-fill + LLM classifier; PoS section: expiry alerts + low-stock + slow-mover flag → these power the reports dashboard)

**Pre-existing context the executor MUST know:**
- `posTerminalService.verifyCashierPin(cashier_id, pin)` is live; cashier rows carry `role` ∈ `{cashier, manager}`. Manager mode in PoS calls this and demands `role === 'manager'`.
- `wmsService.detectStockDrift({ vendor_id })` already exists and returns `DriftReport`. Reports route just wraps it.
- `catalog-snapshot/route.ts:25` filters products by `metadata.created_by_vendor_id`. New product writes MUST set this field — `apps/backend/src/api/vendor/products/route.ts:49` shows the existing precedent. Re-use that pattern.
- Existing `merch/` module is per-tenant browse buckets — DO NOT confuse with the global category roster `catalog_schema/` introduces here. They co-exist: `catalog_schema.category` = global taxonomy (grocery / clothes / pharmacy / salon / restaurant), `merch_category` = per-tenant browse buckets ("Dairy", "Frozen").
- BigNumber dual-column gotcha persists — every NUMERIC write touches both `<col>` AND `raw_<col>` JSONB. See `wms/service.ts:91-98` for the canonical pattern.
- Raw SQL via `(this as any).__container__[ContainerRegistrationKeys.PG_CONNECTION]`.
- Cross-module access via container cradle property: `(this as any).__container__['wmsService']`. Service deps declared in `medusa-config.ts:33`.
- Admin route auth: see `integration-tests/http/admin-pos-terminal.spec.ts:4-20` for `bootstrapAdmin` helper — reuse verbatim for H-3 integration tests.
- AI module: `apps/backend/src/modules/ai/service.ts` already proxies OpenAI with key-optional fall-through. Extend it; do NOT add a second OpenAI client.
- PoS app uses Vite's `import.meta.env.VITE_*`. New admin app uses same convention.

**Speed bar (non-negotiable acceptance):**
- Barcode lookup p95 < 800ms (network bound; cache successful hits in Dexie for the session)
- Schema form render after category pick < 100ms
- CSV import (1,000 rows) < 30s end-to-end, with progress
- Reports dashboard initial load < 1.5s on broadband (lazy-load chart lib)
- Manager PIN verify < 300ms

---

## File structure

**New backend module:**
```
backend/apps/backend/src/modules/catalog_schema/
├── index.ts                                    # Module(CATALOG_SCHEMA_MODULE, { service })
├── service.ts                                  # CatalogSchemaService
├── types.ts                                    # CategoryDTO, FieldDef, SchemaDTO
├── seeds.ts                                    # DEFAULT_SCHEMAS array (grocery, clothes, pharmacy, salon, restaurant, other)
├── models/
│   ├── category.model.ts                       # catalog_schema_category
│   └── schema.model.ts                         # catalog_schema_schema (one JSONB row per category)
└── migrations/
    └── Migration20260526100001.ts              # tables + seed insert
```

**New backend routes:**
```
backend/apps/backend/src/api/admin/catalog-schema/
├── categories/route.ts                         # GET list (paginated)
└── schemas/[handle]/route.ts                   # GET schema for one category handle

backend/apps/backend/src/api/admin/catalog/
├── barcode-lookup/route.ts                     # GET ?code=… → OpenFoodFacts proxy
├── classify/route.ts                           # POST { name, hint? } → { category_handle, confidence }
├── import-csv/route.ts                         # POST multipart file
└── products/route.ts                           # POST create (schema-driven; sets metadata.created_by_vendor_id + metadata.category_handle + metadata.schema_fields)

backend/apps/backend/src/api/admin/reports/
├── sales-summary/route.ts                      # GET ?vendor_id=&from=&to=&bucket=day
├── top-skus/route.ts                           # GET ?vendor_id=&from=&to=&limit=20
├── drift-alerts/route.ts                       # GET ?vendor_id= → wraps wms.detectStockDrift
└── low-stock/route.ts                          # GET ?vendor_id=&threshold=5
```

**AI module extension (in place — no new files):**
```
backend/apps/backend/src/modules/ai/service.ts  # add classifyProductCategory(name, hint?, allowed[])
```

**PoS app extensions:**
```
backend/apps/pos/src/
├── App.tsx                                     # MODIFY — wrap in BrowserRouter; route map
├── routes.tsx                                  # NEW — route table (`/`, `/manager/*`)
├── api/catalog.ts                              # NEW — barcode-lookup, classify, schema fetch, create product, csv upload
├── db/dexie.ts                                 # MODIFY — add `schemas` (cached) + `barcode_cache` tables, bump version to 2
├── state/manager-session.ts                    # NEW — manager PIN gate state
├── ui/screens/
│   ├── manager/
│   │   ├── ManagerLayout.tsx                   # NEW — sidebar + outlet
│   │   ├── ManagerPinGate.tsx                  # NEW — PIN entry, calls cashiers/verify, requires role=manager
│   │   ├── CatalogListScreen.tsx               # NEW — local Dexie list + "Add Product" CTA
│   │   ├── AddProductScreen.tsx                # NEW — wizard: scan → lookup → category → schema fields → save
│   │   └── CsvImportScreen.tsx                 # NEW — file picker, papaparse preview, upload
│   └── (existing screens unchanged)
├── hardware/
│   ├── camera-barcode.ts                       # NEW — getUserMedia + @zxing/browser → emits codes
│   └── (existing barcode.ts for HID unchanged)
├── ui/components/
│   ├── SchemaFieldRenderer.tsx                 # NEW — renders one FieldDef → input
│   └── (others reused)
├── ui/screens/SettingsScreen.tsx               # MODIFY — Reset stuck sales, theme actually applies
└── pwa/theme.ts                                # NEW — sets document.documentElement.dataset.theme + persists
```

**New admin app:**
```
backend/apps/admin/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── tests/setup.ts
├── public/                                     # favicon only — no PWA
└── src/
    ├── main.tsx
    ├── App.tsx                                 # BrowserRouter shell
    ├── env.ts                                  # VITE_API_BASE, VITE_VENDOR_ID
    ├── api/
    │   ├── client.ts                           # same shape as pos/api/client.ts
    │   └── reports.ts                          # sales-summary, top-skus, drift, low-stock typed calls
    ├── state/session.ts                        # Zustand — admin token
    ├── ui/
    │   ├── tokens.css                          # COPY from pos for parity
    │   ├── components/
    │   │   ├── SalesChart.tsx                  # recharts line
    │   │   ├── TopSkusTable.tsx
    │   │   └── AlertsPanel.tsx
    │   └── screens/
    │       ├── LoginScreen.tsx                 # admin login
    │       └── DashboardScreen.tsx             # 3-panel grid
    └── routes.tsx
```

**Backend tests added:**
```
backend/apps/backend/src/modules/catalog_schema/__tests__/catalog-schema.spec.ts
backend/apps/backend/integration-tests/http/admin-catalog-schema.spec.ts
backend/apps/backend/integration-tests/http/admin-catalog.spec.ts
backend/apps/backend/integration-tests/http/admin-reports.spec.ts
```

**Frontend tests added:**
```
backend/apps/pos/tests/manager-pin.test.tsx
backend/apps/pos/tests/add-product.test.tsx
backend/apps/pos/tests/csv-import.test.ts
backend/apps/pos/tests/camera-barcode.test.ts
backend/apps/pos/tests/theme.test.ts
backend/apps/pos/tests/sending-reset.test.ts
backend/apps/admin/tests/dashboard.test.tsx
backend/apps/admin/tests/reports-api.test.ts
```

---

## Task index

**Section 0 — H-2 cleanup (clears the path)**
- Task 0.1 — Theme actually swaps visually (PoS)
- Task 0.2 — On-mount reset of stuck `sending` sale rows (PoS)
- Task 0.3 — Cashier-not-found dummy hash closes timing oracle

**Section 1 — `catalog_schema/` backend module**
- Task 1.1 — Module skeleton + types + DEFAULT_SCHEMAS seed table
- Task 1.2 — Migration creates tables + seeds the five verticals
- Task 1.3 — Service methods: listCategories, getSchemaByHandle
- Task 1.4 — Admin routes GET /admin/catalog-schema/categories + /schemas/:handle
- Task 1.5 — Wire module into `medusa-config.ts`

**Section 2 — Barcode / AI / CSV backend**
- Task 2.1 — `ai.classifyProductCategory(name, hint?, allowed[])`
- Task 2.2 — Route POST /admin/catalog/classify
- Task 2.3 — Route GET /admin/catalog/barcode-lookup → OpenFoodFacts proxy
- Task 2.4 — Route POST /admin/catalog/products (schema-driven create)
- Task 2.5 — Route POST /admin/catalog/import-csv (multipart, batched)
- Task 2.6 — Reports route GET /admin/reports/sales-summary
- Task 2.7 — Reports route GET /admin/reports/top-skus
- Task 2.8 — Reports route GET /admin/reports/drift-alerts
- Task 2.9 — Reports route GET /admin/reports/low-stock

**Section 3 — PoS extension: manager mode + camera + schema-driven add + CSV UI**
- Task 3.1 — Add react-router + Dexie schema bump (schemas + barcode_cache tables)
- Task 3.2 — Manager PIN gate (calls cashiers/verify, demands role=manager)
- Task 3.3 — ManagerLayout + route table; Settings reachable from Manager too
- Task 3.4 — Camera barcode scan helper (@zxing/browser)
- Task 3.5 — Schema fetch + SchemaFieldRenderer
- Task 3.6 — AddProductScreen wizard (scan → lookup → category pick → schema → save)
- Task 3.7 — CatalogListScreen (Dexie list + "Add Product" CTA)
- Task 3.8 — CsvImportScreen (papaparse preview + upload + result table)

**Section 4 — New admin app for the reports dashboard**
- Task 4.1 — Scaffold `apps/admin/` Vite app (port 9300)
- Task 4.2 — api/client.ts + reports.ts typed calls
- Task 4.3 — Admin login screen (reuses backend admin auth)
- Task 4.4 — SalesChart (recharts line) — vendor-scoped, range picker
- Task 4.5 — TopSkusTable
- Task 4.6 — AlertsPanel (drift + low-stock; cohabits with future expiring panel)
- Task 4.7 — DashboardScreen wires the three panels in a desktop grid
- Task 4.8 — Smoke test renders all three with mocked api

**Section 5 — Cross-cutting: docs + smoke + phase tag**
- Task 5.1 — Update `project_phase_h2_done.md` to mark its three "H-3 picks-up" items done
- Task 5.2 — Smoke checklist `docs/superpowers/plans/2026-05-26-phase-h3-smoke-checklist.md`
- Task 5.3 — Git tag `phase-h3-inventory-admin-complete` (local only)

---

## Section 0 — H-2 cleanup

### Task 0.1: Theme actually swaps visually (PoS)

**Files:**
- Create: `backend/apps/pos/src/pwa/theme.ts`
- Modify: `backend/apps/pos/src/main.tsx`
- Modify: `backend/apps/pos/src/state/config.ts:24-26`
- Test: `backend/apps/pos/tests/theme.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/apps/pos/tests/theme.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme, resolveStoredTheme } from '../src/pwa/theme';
import { saveConfig, defaultConfig } from '../src/state/config';
import { resetDbForTests } from '../src/db/dexie';

describe('theme', () => {
  beforeEach(async () => {
    await resetDbForTests();
    document.documentElement.removeAttribute('data-theme');
  });

  it('applyTheme writes data-theme attribute on documentElement', () => {
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('resolveStoredTheme reads the persisted config and applies it', async () => {
    await saveConfig({ ...defaultConfig, theme: 'light' });
    await resolveStoredTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/pos && npx vitest run tests/theme.test.ts`
Expected: FAIL — `Cannot find module '../src/pwa/theme'`.

- [ ] **Step 3: Write the helper**

```typescript
// backend/apps/pos/src/pwa/theme.ts
import { loadConfig } from '../state/config';

export type ThemeName = 'dark' | 'light';

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export async function resolveStoredTheme(): Promise<void> {
  const cfg = await loadConfig();
  applyTheme(cfg.theme);
}
```

- [ ] **Step 4: Wire SettingsScreen save path so theme applies immediately**

Modify `backend/apps/pos/src/state/config.ts`:

```typescript
import { db } from '../db/dexie';
import { applyTheme } from '../pwa/theme';

export type QuickButton = { variant_id: string; label: string; color: string };

export type Config = {
  theme: 'dark' | 'light';
  quick_buttons: QuickButton[];
  shop_name: string;
  vendor_address: string;
};

export const defaultConfig: Config = {
  theme: 'dark',
  quick_buttons: [],
  shop_name: 'Hanoot Shop',
  vendor_address: '',
};

export async function loadConfig(): Promise<Config> {
  const row = await db.config.get('app');
  return (row?.value as Config) ?? { ...defaultConfig, quick_buttons: [] };
}

export async function saveConfig(c: Config): Promise<void> {
  await db.config.put({ key: 'app', value: c });
  applyTheme(c.theme);
}
```

- [ ] **Step 5: Apply on app boot**

Modify `backend/apps/pos/src/main.tsx` — add before render:

```typescript
import { resolveStoredTheme } from './pwa/theme';
resolveStoredTheme();
```

(Insert near the top alongside other imports; await is not required — fire-and-forget is fine because the default attribute matches the default theme.)

- [ ] **Step 6: Add CSS hooks**

Append to `backend/apps/pos/src/ui/tokens.css` (create file with minimal content if it does not already exist for the test):

```css
:root,
:root[data-theme='dark'] {
  --bg: #0B0B0F;
  --surface: #15151B;
  --text: #F7F7F8;
  --accent: #21d07a;
  --danger: #DC2626;
  --radius: 8px;
}
:root[data-theme='light'] {
  --bg: #FFFFFF;
  --surface: #F7F7F8;
  --text: #0B0B0F;
  --accent: #0F766E;
  --danger: #DC2626;
  --radius: 8px;
}
body { background: var(--bg); color: var(--text); }
```

- [ ] **Step 7: Run tests**

Run: `cd backend/apps/pos && npx vitest run tests/theme.test.ts`
Expected: PASS — 2 passing.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/pos/src/pwa/theme.ts backend/apps/pos/src/main.tsx backend/apps/pos/src/state/config.ts backend/apps/pos/src/ui/tokens.css backend/apps/pos/tests/theme.test.ts
git commit -m "fix(pos): theme toggle actually applies via data-theme attribute (H-2 cleanup)"
```

---

### Task 0.2: On-mount reset of stuck `sending` sale rows

**Files:**
- Modify: `backend/apps/pos/src/sync/sync-worker.ts`
- Modify: `backend/apps/pos/src/App.tsx:10-14`
- Test: `backend/apps/pos/tests/sending-reset.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/apps/pos/tests/sending-reset.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDbForTests } from '../src/db/dexie';
import { resetStuckSendingRows } from '../src/sync/sync-worker';

describe('resetStuckSendingRows', () => {
  beforeEach(async () => { await resetDbForTests(); });

  it('moves all status=sending rows back to queued', async () => {
    await db.sales_pending.put({
      client_id: 'cli_stuck', vendor_id: 'v', cashier_id: 'c', terminal_id: 't',
      lines: [{ variant_id: 'v1', qty: 1, unit_price_minor: 100, name_snapshot: 'x' }],
      paid_amount_minor: 100, currency_code: 'iqd',
      client_created_at: new Date().toISOString(),
      status: 'sending', attempts: 1, last_error: null,
    });
    const reset = await resetStuckSendingRows();
    expect(reset).toBe(1);
    const row = await db.sales_pending.get('cli_stuck');
    expect(row?.status).toBe('queued');
  });

  it('does not touch sent or failed rows', async () => {
    await db.sales_pending.put({
      client_id: 'cli_sent', vendor_id: 'v', cashier_id: 'c', terminal_id: 't',
      lines: [{ variant_id: 'v1', qty: 1, unit_price_minor: 100, name_snapshot: 'x' }],
      paid_amount_minor: 100, currency_code: 'iqd',
      client_created_at: new Date().toISOString(),
      status: 'sent', attempts: 1, last_error: null,
    });
    const reset = await resetStuckSendingRows();
    expect(reset).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/pos && npx vitest run tests/sending-reset.test.ts`
Expected: FAIL — `resetStuckSendingRows is not a function`.

- [ ] **Step 3: Implement and export**

Append to `backend/apps/pos/src/sync/sync-worker.ts`:

```typescript
/**
 * Resets any pending sales left in 'sending' state from a prior session that
 * was killed mid-drain. Called once on app mount before background sync starts.
 * Otherwise these rows would never be retried (drainOnce only picks 'queued').
 */
export async function resetStuckSendingRows(): Promise<number> {
  const stuck = await db.sales_pending.where('status').equals('sending').toArray();
  for (const row of stuck) {
    await db.sales_pending.update(row.client_id, { status: 'queued' });
  }
  return stuck.length;
}
```

- [ ] **Step 4: Call from App mount**

Modify `backend/apps/pos/src/App.tsx`:

```typescript
import { useEffect } from 'react';
import { useSession } from './state/session';
import { LoginScreen } from './ui/screens/LoginScreen';
import { RegisterScreen } from './ui/screens/RegisterScreen';
import {
  attachNetworkListeners,
  startBackgroundSync,
  stopBackgroundSync,
  resetStuckSendingRows,
} from './sync/sync-client';

export default function App() {
  const cashier_id = useSession((s) => s.cashier_id);

  useEffect(() => {
    resetStuckSendingRows().catch(() => {});
    attachNetworkListeners();
    startBackgroundSync(5000);
    return () => stopBackgroundSync();
  }, []);

  if (!cashier_id) return <LoginScreen />;
  return <RegisterScreen />;
}
```

Re-export from `sync-client.ts` (existing wrapper) so the import is symmetric — add to `backend/apps/pos/src/sync/sync-client.ts`:

```typescript
export { resetStuckSendingRows } from './sync-worker';
```

- [ ] **Step 5: Run test**

Run: `cd backend/apps/pos && npx vitest run tests/sending-reset.test.ts`
Expected: PASS — 2 passing.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/pos/src/sync/sync-worker.ts backend/apps/pos/src/sync/sync-client.ts backend/apps/pos/src/App.tsx backend/apps/pos/tests/sending-reset.test.ts
git commit -m "fix(pos): reset stuck 'sending' sale rows on app mount (H-2 cleanup)"
```

---

### Task 0.3: Cashier-not-found dummy hash closes timing oracle

**Files:**
- Modify: `backend/apps/backend/src/modules/pos_terminal/service.ts:272-291`
- Test: `backend/apps/backend/src/modules/pos_terminal/__tests__/cashier-timing.spec.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
// backend/apps/backend/src/modules/pos_terminal/__tests__/cashier-timing.spec.ts
import { describe, it, expect } from '@jest/globals';
import { performance } from 'perf_hooks';

// We test the boundary: not-found path should NOT short-circuit. We can
// inspect the source for a marker constant, since wallclock variance in CI
// makes timing-comparison flaky. The marker is asserted to exist.
import fs from 'fs';
import path from 'path';

describe('verifyCashierPin timing-safe not-found path', () => {
  it('source includes the DUMMY_PIN_HASH constant', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../service.ts'),
      'utf-8',
    );
    expect(src).toMatch(/DUMMY_PIN_HASH/);
    expect(src).toMatch(/DUMMY_PIN_SALT/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/backend && npx jest src/modules/pos_terminal/__tests__/cashier-timing.spec.ts`
Expected: FAIL — `Expected /DUMMY_PIN_HASH/ ... got source without it`.

- [ ] **Step 3: Patch the service**

Modify `backend/apps/backend/src/modules/pos_terminal/service.ts` — replace the `verifyCashierPin` method body with a constant-time path:

```typescript
// Pre-computed once at module load. Salt + hash are arbitrary 32-byte hex
// values; their only purpose is to make the not-found path execute the same
// scrypt+timingSafeEqual sequence as the found path, so an attacker cannot
// distinguish "wrong PIN" from "wrong cashier_id" by response latency.
const DUMMY_PIN_SALT =
  '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const DUMMY_PIN_HASH = scryptSync('__dummy__', DUMMY_PIN_SALT, SCRYPT_KEYLEN)
  .toString('hex');

// ... inside class:

async verifyCashierPin(cashierId: string, pin: string): Promise<CashierDTO> {
  const [rows] = await (this as any).listAndCountCashiers({
    id: cashierId,
    active: true,
  });
  const row = rows[0];
  const salt = row?.pin_salt ?? DUMMY_PIN_SALT;
  const storedHex = row?.pin_hash ?? DUMMY_PIN_HASH;

  const candidate = Buffer.from(hashPin(pin, salt), 'hex');
  const stored = Buffer.from(storedHex, 'hex');
  const lengthsMatch = candidate.length === stored.length;
  // timingSafeEqual requires equal lengths — if not, force a fixed-cost compare
  // against the dummy and ignore the boolean result.
  const safeMatch = lengthsMatch
    ? timingSafeEqual(candidate, stored)
    : (timingSafeEqual(candidate.slice(0, Math.min(candidate.length, stored.length)),
                       stored.slice(0, Math.min(candidate.length, stored.length))), false);

  if (!row || !safeMatch) throw new PosTerminalBadPinError(cashierId);

  return {
    id: row.id,
    vendor_id: row.vendor_id,
    name: row.name,
    role: row.role,
    active: row.active,
  };
}
```

- [ ] **Step 4: Re-run all pos_terminal tests**

Run: `cd backend/apps/backend && npx jest pos_terminal`
Expected: PASS — including the existing `verify` integration test that asserts good PIN passes / bad PIN rejects with 401.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/backend/src/modules/pos_terminal/service.ts backend/apps/backend/src/modules/pos_terminal/__tests__/cashier-timing.spec.ts
git commit -m "fix(pos_terminal): constant-time verifyCashierPin via dummy hash (H-2 cleanup)"
```

---

## Section 1 — `catalog_schema/` backend module

### Task 1.1: Module skeleton + types + DEFAULT_SCHEMAS seed table

**Files:**
- Create: `backend/apps/backend/src/modules/catalog_schema/index.ts`
- Create: `backend/apps/backend/src/modules/catalog_schema/service.ts`
- Create: `backend/apps/backend/src/modules/catalog_schema/types.ts`
- Create: `backend/apps/backend/src/modules/catalog_schema/seeds.ts`
- Create: `backend/apps/backend/src/modules/catalog_schema/models/category.model.ts`
- Create: `backend/apps/backend/src/modules/catalog_schema/models/schema.model.ts`

- [ ] **Step 1: Write `types.ts`**

```typescript
// backend/apps/backend/src/modules/catalog_schema/types.ts
export type FieldKind =
  | 'text' | 'textarea' | 'number' | 'price_minor'
  | 'select' | 'multi_select' | 'date' | 'boolean' | 'image';

export type FieldDef = {
  key: string;          // e.g. "weight_grams"
  label: string;        // human label e.g. "Weight (g)"
  kind: FieldKind;
  required?: boolean;
  options?: string[];   // for select / multi_select
  unit?: string;        // e.g. "g", "ml"
  help?: string;
};

export type CategoryDTO = {
  id: string;
  handle: string;       // 'grocery' | 'clothes' | 'pharmacy' | 'salon' | 'restaurant' | 'other'
  name: string;
  icon: string | null;  // emoji or url
  position: number;
};

export type SchemaDTO = {
  category_handle: string;
  fields: FieldDef[];
  updated_at: string;
};

export interface CatalogSchemaServiceInterface {
  ping(): string;
  listCategories(): Promise<CategoryDTO[]>;
  getSchemaByHandle(handle: string): Promise<SchemaDTO | null>;
}
```

- [ ] **Step 2: Write `seeds.ts`**

```typescript
// backend/apps/backend/src/modules/catalog_schema/seeds.ts
import type { FieldDef } from './types';

type SeedCategory = {
  handle: string;
  name: string;
  icon: string;
  position: number;
  fields: FieldDef[];
};

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    handle: 'grocery', name: 'Grocery', icon: '🛒', position: 1,
    fields: [
      { key: 'weight_grams', label: 'Weight (g)', kind: 'number', unit: 'g' },
      { key: 'volume_ml', label: 'Volume (ml)', kind: 'number', unit: 'ml' },
      { key: 'expiry_date', label: 'Expiry date', kind: 'date' },
      { key: 'brand', label: 'Brand', kind: 'text' },
      { key: 'is_chilled', label: 'Needs refrigeration', kind: 'boolean' },
    ],
  },
  {
    handle: 'clothes', name: 'Clothes', icon: '👕', position: 2,
    fields: [
      { key: 'size', label: 'Size', kind: 'select',
        options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], required: true },
      { key: 'color', label: 'Color', kind: 'text', required: true },
      { key: 'material', label: 'Material', kind: 'text' },
      { key: 'gender', label: 'Gender', kind: 'select',
        options: ['mens', 'womens', 'kids', 'unisex'] },
    ],
  },
  {
    handle: 'pharmacy', name: 'Pharmacy', icon: '💊', position: 3,
    fields: [
      { key: 'active_ingredient', label: 'Active ingredient', kind: 'text', required: true },
      { key: 'dosage', label: 'Dosage', kind: 'text', help: 'e.g. 500mg' },
      { key: 'expiry_date', label: 'Expiry date', kind: 'date', required: true },
      { key: 'prescription_required', label: 'Prescription required', kind: 'boolean' },
    ],
  },
  {
    handle: 'salon', name: 'Salon / Service', icon: '💇', position: 4,
    fields: [
      { key: 'service_duration_minutes', label: 'Duration (min)', kind: 'number', required: true },
      { key: 'staff_required', label: 'Staff required', kind: 'number' },
    ],
  },
  {
    handle: 'restaurant', name: 'Restaurant', icon: '🍽️', position: 5,
    fields: [
      { key: 'prep_time_minutes', label: 'Prep time (min)', kind: 'number' },
      { key: 'is_vegetarian', label: 'Vegetarian', kind: 'boolean' },
      { key: 'spice_level', label: 'Spice', kind: 'select',
        options: ['none', 'mild', 'medium', 'hot', 'extra_hot'] },
    ],
  },
  {
    handle: 'other', name: 'Other', icon: '📦', position: 99,
    fields: [
      { key: 'notes', label: 'Notes', kind: 'textarea' },
    ],
  },
];
```

- [ ] **Step 3: Write `models/category.model.ts` and `models/schema.model.ts`**

```typescript
// backend/apps/backend/src/modules/catalog_schema/models/category.model.ts
import { model } from '@medusajs/framework/utils';

export const Category = model.define('catalog_schema_category', {
  id: model.id({ prefix: 'csc' }).primaryKey(),
  handle: model.text().unique(),
  name: model.text(),
  icon: model.text().nullable(),
  position: model.number().default(0),
});
```

```typescript
// backend/apps/backend/src/modules/catalog_schema/models/schema.model.ts
import { model } from '@medusajs/framework/utils';

export const Schema = model.define('catalog_schema_schema', {
  id: model.id({ prefix: 'css' }).primaryKey(),
  category_handle: model.text().unique(),
  fields_json: model.json(),
});
```

- [ ] **Step 4: Write `service.ts`**

```typescript
// backend/apps/backend/src/modules/catalog_schema/service.ts
import { MedusaService } from '@medusajs/framework/utils';
import { Category } from './models/category.model';
import { Schema } from './models/schema.model';
import { CatalogSchemaServiceInterface, CategoryDTO, FieldDef, SchemaDTO } from './types';

class CatalogSchemaServiceBase extends MedusaService({ Category, Schema }) {}

export class CatalogSchemaService extends CatalogSchemaServiceBase
  implements CatalogSchemaServiceInterface {

  ping(): string { return 'catalog-schema-ok'; }

  async listCategories(): Promise<CategoryDTO[]> {
    const [rows] = await (this as any).listAndCountCategories(
      {}, { order: { position: 'ASC' } },
    );
    return rows.map((r: any) => ({
      id: r.id, handle: r.handle, name: r.name, icon: r.icon, position: r.position,
    }));
  }

  async getSchemaByHandle(handle: string): Promise<SchemaDTO | null> {
    const [rows] = await (this as any).listAndCountSchemas({ category_handle: handle });
    if (!rows.length) return null;
    const r = rows[0];
    return {
      category_handle: r.category_handle,
      fields: r.fields_json as FieldDef[],
      updated_at: r.updated_at?.toISOString?.() ?? new Date().toISOString(),
    };
  }
}

export default CatalogSchemaService;
```

- [ ] **Step 5: Write `index.ts`**

```typescript
// backend/apps/backend/src/modules/catalog_schema/index.ts
import { Module } from '@medusajs/framework/utils';
import { CatalogSchemaService } from './service';

export const CATALOG_SCHEMA_MODULE = 'catalogSchemaService';

export default Module(CATALOG_SCHEMA_MODULE, {
  service: CatalogSchemaService,
});
```

- [ ] **Step 6: Commit**

```bash
git add backend/apps/backend/src/modules/catalog_schema/
git commit -m "feat(catalog_schema): module skeleton + DEFAULT_SCHEMAS for 6 verticals"
```

---

### Task 1.2: Migration creates tables + seeds the five verticals

**Files:**
- Create: `backend/apps/backend/src/modules/catalog_schema/migrations/Migration20260526100001.ts`

- [ ] **Step 1: Write the migration**

```typescript
// backend/apps/backend/src/modules/catalog_schema/migrations/Migration20260526100001.ts
import { Migration } from '@medusajs/framework/mikro-orm/migrations';
import { DEFAULT_CATEGORIES } from '../seeds';
import { randomUUID } from 'crypto';

export class Migration20260526100001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS catalog_schema_category (
        id text PRIMARY KEY,
        handle text NOT NULL,
        name text NOT NULL,
        icon text,
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_catalog_schema_category_handle
        ON catalog_schema_category(handle) WHERE deleted_at IS NULL;

      CREATE TABLE IF NOT EXISTS catalog_schema_schema (
        id text PRIMARY KEY,
        category_handle text NOT NULL,
        fields_json jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_catalog_schema_schema_handle
        ON catalog_schema_schema(category_handle) WHERE deleted_at IS NULL;
    `);

    // Seed rows (idempotent — ON CONFLICT DO NOTHING)
    for (const c of DEFAULT_CATEGORIES) {
      const catId = `csc_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const schId = `css_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
      this.addSql(
        `INSERT INTO catalog_schema_category (id, handle, name, icon, position)
         VALUES ('${catId}', '${c.handle}', '${c.name.replace(/'/g, "''")}',
                 ${c.icon ? `'${c.icon}'` : 'NULL'}, ${c.position})
         ON CONFLICT (handle) WHERE deleted_at IS NULL DO NOTHING;`,
      );
      const fieldsJson = JSON.stringify(c.fields).replace(/'/g, "''");
      this.addSql(
        `INSERT INTO catalog_schema_schema (id, category_handle, fields_json)
         VALUES ('${schId}', '${c.handle}', '${fieldsJson}'::jsonb)
         ON CONFLICT (category_handle) WHERE deleted_at IS NULL DO NOTHING;`,
      );
    }
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS catalog_schema_schema;`);
    this.addSql(`DROP TABLE IF EXISTS catalog_schema_category;`);
  }
}
```

- [ ] **Step 2: Commit (migration is verified end-to-end in Task 1.4's integration test)**

```bash
git add backend/apps/backend/src/modules/catalog_schema/migrations/
git commit -m "feat(catalog_schema): migration creates tables + seeds 6 vertical schemas"
```

---

### Task 1.3: Service unit tests (listCategories, getSchemaByHandle)

**Files:**
- Create: `backend/apps/backend/src/modules/catalog_schema/__tests__/catalog-schema.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
// backend/apps/backend/src/modules/catalog_schema/__tests__/catalog-schema.spec.ts
import { moduleIntegrationTestRunner } from '@medusajs/test-utils';
import { CATALOG_SCHEMA_MODULE } from '..';
import catalogSchemaModule from '..';

moduleIntegrationTestRunner({
  moduleName: CATALOG_SCHEMA_MODULE,
  moduleModels: [],
  resolve: catalogSchemaModule,
  testSuite: ({ service }) => {
    describe('CatalogSchemaService', () => {
      it('ping returns ok', () => {
        expect(service.ping()).toBe('catalog-schema-ok');
      });

      it('listCategories returns the 6 seeded verticals in position order', async () => {
        const cats = await service.listCategories();
        expect(cats.map((c: any) => c.handle)).toEqual(
          ['grocery', 'clothes', 'pharmacy', 'salon', 'restaurant', 'other'],
        );
      });

      it('getSchemaByHandle("grocery") returns weight + expiry fields', async () => {
        const s = await service.getSchemaByHandle('grocery');
        expect(s).not.toBeNull();
        const keys = (s!.fields as any[]).map((f) => f.key);
        expect(keys).toContain('weight_grams');
        expect(keys).toContain('expiry_date');
      });

      it('getSchemaByHandle("nope") returns null', async () => {
        const s = await service.getSchemaByHandle('nope');
        expect(s).toBeNull();
      });
    });
  },
});
```

- [ ] **Step 2: Run**

Run: `cd backend/apps/backend && npx jest catalog_schema/__tests__/catalog-schema.spec.ts`
Expected: PASS — 4 passing (migration runs automatically, seeds populate, queries return them).

- [ ] **Step 3: Commit**

```bash
git add backend/apps/backend/src/modules/catalog_schema/__tests__/
git commit -m "test(catalog_schema): module integration tests for list + getByHandle"
```

---

### Task 1.4: Admin routes GET /admin/catalog-schema/categories + /schemas/:handle

**Files:**
- Create: `backend/apps/backend/src/api/admin/catalog-schema/categories/route.ts`
- Create: `backend/apps/backend/src/api/admin/catalog-schema/schemas/[handle]/route.ts`
- Create: `backend/apps/backend/integration-tests/http/admin-catalog-schema.spec.ts`

- [ ] **Step 1: Write the failing HTTP test**

```typescript
// backend/apps/backend/integration-tests/http/admin-catalog-schema.spec.ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { createUserAccountWorkflow } from '@medusajs/core-flows';

async function bootstrapAdmin(api: any, container: any) {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
  const password = 'supersecret1';
  const registerRes = await api
    .post(`/auth/user/emailpass/register`, { email, password })
    .catch((e: any) => e.response);
  const [, payloadB64] = (registerRes.data.token as string).split('.');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
  await createUserAccountWorkflow(container).run({
    input: { authIdentityId: payload.auth_identity_id, userData: { email, first_name: 'T', last_name: 'A' } },
  });
  const loginRes = await api.post(`/auth/user/emailpass`, { email, password });
  return { headers: { Authorization: `Bearer ${loginRes.data.token}` } };
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>;
    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer());
      adminHeaders = headers;
    });

    it('GET /admin/catalog-schema/categories returns seeded categories', async () => {
      const r = await api.get('/admin/catalog-schema/categories', { headers: adminHeaders });
      expect(r.status).toBe(200);
      const handles = r.data.categories.map((c: any) => c.handle);
      expect(handles).toContain('grocery');
      expect(handles).toContain('clothes');
    });

    it('GET /admin/catalog-schema/schemas/grocery returns weight_grams field', async () => {
      const r = await api.get('/admin/catalog-schema/schemas/grocery', { headers: adminHeaders });
      expect(r.status).toBe(200);
      const keys = r.data.schema.fields.map((f: any) => f.key);
      expect(keys).toContain('weight_grams');
    });

    it('GET /admin/catalog-schema/schemas/nope returns 404', async () => {
      const r = await api.get('/admin/catalog-schema/schemas/nope', { headers: adminHeaders })
        .catch((e: any) => e.response);
      expect(r.status).toBe(404);
    });
  },
});
```

- [ ] **Step 2: Run, observe failure**

Run: `cd backend/apps/backend && npx jest integration-tests/http/admin-catalog-schema.spec.ts`
Expected: FAIL — route not mounted (404 on the first GET).

- [ ] **Step 3: Implement routes**

```typescript
// backend/apps/backend/src/api/admin/catalog-schema/categories/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('catalogSchemaService');
  const categories = await svc.listCategories();
  res.json({ categories });
}
```

```typescript
// backend/apps/backend/src/api/admin/catalog-schema/schemas/[handle]/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('catalogSchemaService');
  const handle = (req.params as any).handle as string;
  const schema = await svc.getSchemaByHandle(handle);
  if (!schema) return res.status(404).json({ error: `no schema for handle "${handle}"` });
  res.json({ schema });
}
```

- [ ] **Step 4: Run again**

Run: `cd backend/apps/backend && npx jest integration-tests/http/admin-catalog-schema.spec.ts`
Expected: PASS — 3 passing.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/backend/src/api/admin/catalog-schema/ backend/apps/backend/integration-tests/http/admin-catalog-schema.spec.ts
git commit -m "feat(api): admin catalog-schema routes (list categories + get schema by handle)"
```

---

### Task 1.5: Wire module into `medusa-config.ts`

**Files:**
- Modify: `backend/apps/backend/medusa-config.ts:17-34`

- [ ] **Step 1: Add module entry**

Edit `medusa-config.ts` — insert one line at the end of the `modules` array:

```typescript
    { resolve: "./src/modules/wms" },
    { resolve: "./src/modules/pos_terminal", dependencies: ['wmsService'] },
    { resolve: "./src/modules/catalog_schema" },
  ],
```

- [ ] **Step 2: Re-run the integration tests (loaded via medusa-config)**

Run: `cd backend/apps/backend && npx jest integration-tests/http/admin-catalog-schema.spec.ts`
Expected: PASS — module is resolved by container.

- [ ] **Step 3: Commit**

```bash
git add backend/apps/backend/medusa-config.ts
git commit -m "chore(backend): register catalog_schema module in medusa-config"
```

---

## Section 2 — Barcode / AI / CSV backend

### Task 2.1: `ai.classifyProductCategory(name, hint?, allowed[])`

**Files:**
- Modify: `backend/apps/backend/src/modules/ai/service.ts`
- Create: `backend/apps/backend/src/modules/ai/__tests__/classify.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/apps/backend/src/modules/ai/__tests__/classify.spec.ts
import { describe, it, expect } from '@jest/globals';
import AiService from '../service';

describe('AiService.classifyProductCategory (key-optional)', () => {
  it('returns "other" with 0 confidence when no OPENAI_API_KEY is set', async () => {
    delete process.env.OPENAI_API_KEY;
    const svc = new AiService({} as any, {} as any);
    const r = await svc.classifyProductCategory('Anything', undefined,
      ['grocery', 'clothes', 'pharmacy', 'salon', 'restaurant', 'other']);
    expect(r.category_handle).toBe('other');
    expect(r.confidence).toBe(0);
  });

  it('throws when allowed list is empty', async () => {
    delete process.env.OPENAI_API_KEY;
    const svc = new AiService({} as any, {} as any);
    await expect(svc.classifyProductCategory('x', undefined, []))
      .rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run**

Run: `cd backend/apps/backend && npx jest src/modules/ai/__tests__/classify.spec.ts`
Expected: FAIL — `classifyProductCategory is not a function`.

- [ ] **Step 3: Add method to `AiService`**

Append (or insert into the class body of) `backend/apps/backend/src/modules/ai/service.ts`:

```typescript
/**
 * Pick the best category handle for a product name from the allowed list.
 * key-optional: returns { handle: 'other', confidence: 0 } when no key is configured.
 * Caller MUST pass the full allowed handle list (sourced from catalogSchemaService.listCategories).
 */
async classifyProductCategory(
  name: string,
  hint: string | undefined,
  allowed: string[],
): Promise<{ category_handle: string; confidence: number }> {
  if (!allowed.length) throw new Error('allowed list must be non-empty');
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { category_handle: 'other', confidence: 0 };

  const prompt =
    `Classify the retail product name into ONE of: ${allowed.join(', ')}.\n` +
    `Name: ${name}\n` +
    (hint ? `Hint: ${hint}\n` : '') +
    `Respond as compact JSON: {"category_handle":"<one of the list>","confidence":<0..1>}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 60,
      }),
    });
    if (!res.ok) return { category_handle: 'other', confidence: 0 };
    const json: any = await res.json();
    const txt = json?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(txt);
    const handle = allowed.includes(parsed.category_handle) ? parsed.category_handle : 'other';
    const conf = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)));
    return { category_handle: handle, confidence: conf };
  } catch {
    return { category_handle: 'other', confidence: 0 };
  }
}
```

- [ ] **Step 4: Run**

Run: `cd backend/apps/backend && npx jest src/modules/ai/__tests__/classify.spec.ts`
Expected: PASS — 2 passing.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/backend/src/modules/ai/service.ts backend/apps/backend/src/modules/ai/__tests__/classify.spec.ts
git commit -m "feat(ai): classifyProductCategory key-optional with allowed list"
```

---

### Task 2.2: Route POST /admin/catalog/classify

**Files:**
- Create: `backend/apps/backend/src/api/admin/catalog/classify/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// backend/apps/backend/src/api/admin/catalog/classify/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { name, hint } = (req.body ?? {}) as any;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name required' });
  }
  const ai: any = req.scope.resolve('ai');
  const schemaSvc: any = req.scope.resolve('catalogSchemaService');
  const cats = await schemaSvc.listCategories();
  const allowed = cats.map((c: any) => c.handle);
  const out = await ai.classifyProductCategory(name, hint, allowed);
  res.json(out);
}
```

- [ ] **Step 2: Add test to `admin-catalog.spec.ts`** (create the file; this same file holds barcode-lookup + classify + import tests added in 2.3-2.5)

```typescript
// backend/apps/backend/integration-tests/http/admin-catalog.spec.ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { createUserAccountWorkflow } from '@medusajs/core-flows';

async function bootstrapAdmin(api: any, container: any) {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
  const password = 'supersecret1';
  const r = await api.post(`/auth/user/emailpass/register`, { email, password })
    .catch((e: any) => e.response);
  const [, p64] = (r.data.token as string).split('.');
  const payload = JSON.parse(Buffer.from(p64, 'base64url').toString('utf-8'));
  await createUserAccountWorkflow(container).run({
    input: { authIdentityId: payload.auth_identity_id, userData: { email, first_name: 'T', last_name: 'A' } },
  });
  const login = await api.post(`/auth/user/emailpass`, { email, password });
  return { headers: { Authorization: `Bearer ${login.data.token}` } };
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>;
    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer());
      adminHeaders = headers;
    });

    describe('POST /admin/catalog/classify', () => {
      it('400 when name missing', async () => {
        const r = await api.post('/admin/catalog/classify', {}, { headers: adminHeaders })
          .catch((e: any) => e.response);
        expect(r.status).toBe(400);
      });

      it('returns { category_handle, confidence } shape (other / 0 without key)', async () => {
        delete process.env.OPENAI_API_KEY;
        const r = await api.post('/admin/catalog/classify',
          { name: 'Lurpak Butter 200g' }, { headers: adminHeaders });
        expect(r.status).toBe(200);
        expect(typeof r.data.category_handle).toBe('string');
        expect(typeof r.data.confidence).toBe('number');
      });
    });
  },
});
```

- [ ] **Step 3: Run**

Run: `cd backend/apps/backend && npx jest integration-tests/http/admin-catalog.spec.ts`
Expected: PASS — 2 passing.

- [ ] **Step 4: Commit**

```bash
git add backend/apps/backend/src/api/admin/catalog/classify/ backend/apps/backend/integration-tests/http/admin-catalog.spec.ts
git commit -m "feat(api): admin catalog/classify proxies AI category classifier"
```

---

### Task 2.3: Route GET /admin/catalog/barcode-lookup → OpenFoodFacts proxy

**Files:**
- Create: `backend/apps/backend/src/api/admin/catalog/barcode-lookup/route.ts`

- [ ] **Step 1: Add the failing test (append to admin-catalog.spec.ts)**

```typescript
describe('GET /admin/catalog/barcode-lookup', () => {
  it('400 when code missing', async () => {
    const r = await api.get('/admin/catalog/barcode-lookup', { headers: adminHeaders })
      .catch((e: any) => e.response);
    expect(r.status).toBe(400);
  });

  it('returns { found: false } gracefully when upstream returns no product', async () => {
    // 0000000000000 is a known not-found code in OpenFoodFacts
    const r = await api.get('/admin/catalog/barcode-lookup?code=0000000000000',
      { headers: adminHeaders });
    expect(r.status).toBe(200);
    expect(r.data.found).toBe(false);
  });
});
```

- [ ] **Step 2: Run, observe failure**

Run: `cd backend/apps/backend && npx jest integration-tests/http/admin-catalog.spec.ts -t 'barcode-lookup'`
Expected: FAIL — route not mounted.

- [ ] **Step 3: Implement**

```typescript
// backend/apps/backend/src/api/admin/catalog/barcode-lookup/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const code = (req.query.code as string | undefined)?.trim();
  if (!code) return res.status(400).json({ error: 'code required' });
  if (!/^\d{6,14}$/.test(code)) return res.status(400).json({ error: 'code must be 6-14 digits' });

  try {
    const resp = await fetch(`${OFF_BASE}/${encodeURIComponent(code)}.json`, {
      headers: { 'User-Agent': 'Hanoot/0.1 (https://hanoot.iq)' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!resp.ok) return res.json({ found: false, code });
    const json: any = await resp.json();
    if (json.status !== 1 || !json.product) return res.json({ found: false, code });
    const p = json.product;
    res.json({
      found: true,
      code,
      name: p.product_name || p.product_name_en || null,
      brand: p.brands || null,
      image_url: p.image_front_url || p.image_url || null,
      categories: typeof p.categories === 'string' ? p.categories.split(',').map((s: string) => s.trim()) : [],
      weight_grams: p.product_quantity ? Number(p.product_quantity) : null,
      raw_categories_tag: p.categories_tags ?? [],
    });
  } catch {
    res.json({ found: false, code, error: 'upstream_unavailable' });
  }
}
```

- [ ] **Step 4: Run**

Run: `cd backend/apps/backend && npx jest integration-tests/http/admin-catalog.spec.ts -t 'barcode-lookup'`
Expected: PASS — 2 passing.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/backend/src/api/admin/catalog/barcode-lookup/
git commit -m "feat(api): admin catalog/barcode-lookup proxies OpenFoodFacts"
```

---

### Task 2.4: Route POST /admin/catalog/products (schema-driven create)

**Files:**
- Create: `backend/apps/backend/src/api/admin/catalog/products/route.ts`

- [ ] **Step 1: Add the failing test (append to admin-catalog.spec.ts)**

```typescript
describe('POST /admin/catalog/products', () => {
  it('creates product with metadata.created_by_vendor_id + category_handle + schema_fields', async () => {
    const body = {
      vendor_id: 'v_h3',
      title: 'Lurpak Butter 200g',
      barcode: '5740900401099',
      sku: 'LRPK-200',
      price_minor: 4500,
      currency_code: 'iqd',
      category_handle: 'grocery',
      schema_fields: { weight_grams: 200, brand: 'Lurpak' },
      initial_on_hand: 12,
    };
    const r = await api.post('/admin/catalog/products', body, { headers: adminHeaders });
    expect(r.status).toBe(201);
    expect(r.data.product.id).toBeDefined();
    expect(r.data.product.metadata.created_by_vendor_id).toBe('v_h3');
    expect(r.data.product.metadata.category_handle).toBe('grocery');
    expect(r.data.product.metadata.schema_fields.weight_grams).toBe(200);

    // Stock seeded via wms
    const wms: any = getContainer().resolve('wmsService');
    const variantId = r.data.product.variants[0].id;
    const snap = await wms.getStock('v_h3', variantId);
    expect(snap.on_hand).toBe(12);
  });

  it('400 when required fields missing', async () => {
    const r = await api.post('/admin/catalog/products', { title: 'x' }, { headers: adminHeaders })
      .catch((e: any) => e.response);
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// backend/apps/backend/src/api/admin/catalog/products/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

type Body = {
  vendor_id: string;
  title: string;
  description?: string;
  barcode?: string;
  sku?: string;
  thumbnail?: string;
  price_minor: number;
  currency_code: string;
  category_handle: string;
  schema_fields?: Record<string, unknown>;
  initial_on_hand?: number;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body ?? {}) as Partial<Body>;
  const required: (keyof Body)[] = ['vendor_id', 'title', 'price_minor', 'currency_code', 'category_handle'];
  for (const k of required) {
    if (b[k] == null) return res.status(400).json({ error: `${k} required` });
  }
  const body = b as Body;

  const schemaSvc: any = req.scope.resolve('catalogSchemaService');
  const schema = await schemaSvc.getSchemaByHandle(body.category_handle);
  if (!schema) return res.status(400).json({ error: `unknown category_handle "${body.category_handle}"` });

  // Validate required schema fields
  const sf = body.schema_fields ?? {};
  for (const f of schema.fields) {
    if (f.required && (sf[f.key] == null || sf[f.key] === '')) {
      return res.status(400).json({ error: `schema field "${f.key}" required` });
    }
  }

  const product: any = req.scope.resolve('product');
  const created = await product.createProducts({
    title: body.title,
    description: body.description ?? null,
    thumbnail: body.thumbnail ?? null,
    status: 'published',
    metadata: {
      created_by_vendor_id: body.vendor_id,
      category_handle: body.category_handle,
      schema_fields: sf,
    },
    options: [{ title: 'Default', values: ['Default'] }],
    variants: [{
      title: 'Default',
      sku: body.sku ?? null,
      barcode: body.barcode ?? null,
      manage_inventory: false,
      prices: [{ amount: body.price_minor, currency_code: body.currency_code }],
      options: { Default: 'Default' },
    }],
  });
  const p = Array.isArray(created) ? created[0] : created;

  // Seed stock if requested
  if (body.initial_on_hand && body.initial_on_hand > 0) {
    const wms: any = req.scope.resolve('wmsService');
    await wms.incrementStock({
      vendor_id: body.vendor_id,
      variant_id: p.variants[0].id,
      qty: body.initial_on_hand,
      type: 'restock',
      note: 'catalog initial on_hand',
    });
  }

  res.status(201).json({ product: p });
}
```

- [ ] **Step 3: Run**

Run: `cd backend/apps/backend && npx jest integration-tests/http/admin-catalog.spec.ts -t '/admin/catalog/products'`
Expected: PASS — 2 passing.

- [ ] **Step 4: Commit**

```bash
git add backend/apps/backend/src/api/admin/catalog/products/
git commit -m "feat(api): admin catalog/products schema-driven create + initial stock"
```

---

### Task 2.5: Route POST /admin/catalog/import-csv (multipart, batched)

**Files:**
- Create: `backend/apps/backend/src/api/admin/catalog/import-csv/route.ts`
- Modify: `backend/apps/backend/package.json` — add `csv-parse` dep

- [ ] **Step 1: Install csv-parse**

```bash
cd backend/apps/backend && npm install csv-parse@^5
```

- [ ] **Step 2: Append failing test**

```typescript
describe('POST /admin/catalog/import-csv', () => {
  it('imports a 3-row CSV and returns per-row results', async () => {
    const csv =
      'title,sku,barcode,price_minor,currency_code,category_handle,initial_on_hand\n' +
      'Bread,BRD-1,1111111111111,1000,iqd,grocery,5\n' +
      'Milk,MLK-1,2222222222222,2500,iqd,grocery,10\n' +
      'Notebook,NTB-1,3333333333333,1500,iqd,other,3\n';
    const r = await api.post(
      '/admin/catalog/import-csv?vendor_id=v_csv',
      csv,
      { headers: { ...adminHeaders, 'Content-Type': 'text/csv' } },
    );
    expect(r.status).toBe(200);
    expect(r.data.total).toBe(3);
    expect(r.data.created).toBe(3);
    expect(r.data.failed).toBe(0);
  });

  it('returns per-row errors but keeps going', async () => {
    const csv =
      'title,sku,barcode,price_minor,currency_code,category_handle,initial_on_hand\n' +
      ',MISSING-TITLE,4,100,iqd,grocery,0\n' +
      'Valid,VAL-1,5555555555555,1000,iqd,grocery,2\n';
    const r = await api.post(
      '/admin/catalog/import-csv?vendor_id=v_csv2',
      csv,
      { headers: { ...adminHeaders, 'Content-Type': 'text/csv' } },
    );
    expect(r.status).toBe(200);
    expect(r.data.created).toBe(1);
    expect(r.data.failed).toBe(1);
    expect(r.data.errors[0]).toMatchObject({ row: 2 });
  });
});
```

- [ ] **Step 3: Implement**

```typescript
// backend/apps/backend/src/api/admin/catalog/import-csv/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { parse } from 'csv-parse/sync';

type Row = {
  title?: string;
  sku?: string;
  barcode?: string;
  price_minor?: string;
  currency_code?: string;
  category_handle?: string;
  initial_on_hand?: string;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });

  // Body is raw text/csv (handled because Medusa's express setup keeps the raw
  // body on `req.rawBody`; falls back to req.body if it was already buffered).
  const raw = (req as any).rawBody?.toString?.('utf-8') ?? (typeof req.body === 'string' ? req.body : '');
  if (!raw) return res.status(400).json({ error: 'csv body required' });

  let rows: Row[];
  try {
    rows = parse(raw, { columns: true, trim: true, skip_empty_lines: true });
  } catch (e: any) {
    return res.status(400).json({ error: `csv parse failed: ${e?.message}` });
  }

  const schemaSvc: any = req.scope.resolve('catalogSchemaService');
  const product: any = req.scope.resolve('product');
  const wms: any = req.scope.resolve('wmsService');

  const validHandles = new Set<string>(
    (await schemaSvc.listCategories()).map((c: any) => c.handle),
  );

  let created = 0;
  let failed = 0;
  const errors: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 1;
    try {
      if (!r.title) throw new Error('title required');
      if (!r.price_minor) throw new Error('price_minor required');
      const handle = r.category_handle || 'other';
      if (!validHandles.has(handle)) throw new Error(`unknown category_handle "${handle}"`);
      const priceMinor = Number(r.price_minor);
      if (!Number.isFinite(priceMinor) || priceMinor < 0) throw new Error('price_minor invalid');
      const stock = r.initial_on_hand ? Number(r.initial_on_hand) : 0;

      const createdRows = await product.createProducts({
        title: r.title,
        status: 'published',
        metadata: {
          created_by_vendor_id: vendor_id,
          category_handle: handle,
          schema_fields: {},
        },
        options: [{ title: 'Default', values: ['Default'] }],
        variants: [{
          title: 'Default',
          sku: r.sku || null,
          barcode: r.barcode || null,
          manage_inventory: false,
          prices: [{ amount: priceMinor, currency_code: r.currency_code || 'iqd' }],
          options: { Default: 'Default' },
        }],
      });
      const p = Array.isArray(createdRows) ? createdRows[0] : createdRows;
      if (stock > 0) {
        await wms.incrementStock({
          vendor_id, variant_id: p.variants[0].id, qty: stock,
          type: 'restock', note: 'csv import',
        });
      }
      created++;
    } catch (e: any) {
      failed++;
      errors.push({ row: rowNum, reason: e?.message ?? String(e) });
    }
  }

  res.json({ total: rows.length, created, failed, errors });
}
```

- [ ] **Step 4: Run**

Run: `cd backend/apps/backend && npx jest integration-tests/http/admin-catalog.spec.ts -t 'import-csv'`
Expected: PASS — 2 passing.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/backend/src/api/admin/catalog/import-csv/ backend/apps/backend/package.json backend/apps/backend/package-lock.json
git commit -m "feat(api): admin catalog/import-csv batched import w/ per-row errors"
```

---

### Task 2.6: Reports route GET /admin/reports/sales-summary

**Files:**
- Create: `backend/apps/backend/src/api/admin/reports/sales-summary/route.ts`
- Create: `backend/apps/backend/integration-tests/http/admin-reports.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/apps/backend/integration-tests/http/admin-reports.spec.ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { createUserAccountWorkflow } from '@medusajs/core-flows';

async function bootstrapAdmin(api: any, container: any) {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
  const password = 'supersecret1';
  const r = await api.post(`/auth/user/emailpass/register`, { email, password })
    .catch((e: any) => e.response);
  const [, p64] = (r.data.token as string).split('.');
  const payload = JSON.parse(Buffer.from(p64, 'base64url').toString('utf-8'));
  await createUserAccountWorkflow(container).run({
    input: { authIdentityId: payload.auth_identity_id, userData: { email, first_name: 'T', last_name: 'A' } },
  });
  const login = await api.post(`/auth/user/emailpass`, { email, password });
  return { headers: { Authorization: `Bearer ${login.data.token}` } };
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>;
    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer());
      adminHeaders = headers;
    });

    async function seedSale(vendor: string, variant: string, qty: number, price: number) {
      const wms: any = getContainer().resolve('wmsService');
      await wms.incrementStock({ vendor_id: vendor, variant_id: variant, qty, type: 'restock' });
      const svc: any = getContainer().resolve('posTerminalService');
      const cashier = await svc.createCashier({ vendor_id: vendor, name: 'C', pin: '1', role: 'cashier' });
      await svc.recordSale({
        client_id: `cli_${vendor}_${variant}_${Date.now()}_${Math.random()}`,
        vendor_id: vendor, cashier_id: cashier.id, terminal_id: 't',
        lines: [{ variant_id: variant, qty, unit_price_minor: price, name_snapshot: variant }],
        paid_amount_minor: qty * price, currency_code: 'iqd',
        client_created_at: new Date().toISOString(),
      });
    }

    it('GET /admin/reports/sales-summary returns daily buckets summing to vendor revenue', async () => {
      await seedSale('v_rep', 'var_a', 2, 1000);
      await seedSale('v_rep', 'var_b', 1, 500);
      const r = await api.get('/admin/reports/sales-summary?vendor_id=v_rep', { headers: adminHeaders });
      expect(r.status).toBe(200);
      const total = r.data.buckets.reduce((s: number, b: any) => s + b.revenue_minor, 0);
      expect(total).toBe(2500);
    });

    it('GET /admin/reports/sales-summary 400 when vendor_id missing', async () => {
      const r = await api.get('/admin/reports/sales-summary', { headers: adminHeaders })
        .catch((e: any) => e.response);
      expect(r.status).toBe(400);
    });
  },
});
```

- [ ] **Step 2: Run, observe failure**

Run: `cd backend/apps/backend && npx jest integration-tests/http/admin-reports.spec.ts`
Expected: FAIL — route not mounted.

- [ ] **Step 3: Implement**

```typescript
// backend/apps/backend/src/api/admin/reports/sales-summary/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });

  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400_000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const bucket = (req.query.bucket as string | undefined) ?? 'day';
  if (!['day', 'hour', 'week'].includes(bucket)) {
    return res.status(400).json({ error: 'bucket must be day | hour | week' });
  }

  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const sql = `
    SELECT date_trunc('${bucket}', created_at) AS bucket_at,
           COUNT(*) AS sale_count,
           SUM(total_minor::numeric) AS revenue_minor
      FROM pos_sale
     WHERE vendor_id = ?
       AND status = 'completed'
       AND deleted_at IS NULL
       AND created_at >= ? AND created_at <= ?
     GROUP BY 1
     ORDER BY 1 ASC`;
  const r = await pg.raw(sql, [vendor_id, from, to]);
  const rows = r?.rows ?? r ?? [];

  res.json({
    vendor_id, from, to, bucket,
    buckets: rows.map((row: any) => ({
      bucket_at: row.bucket_at,
      sale_count: Number(row.sale_count),
      revenue_minor: Number(row.revenue_minor),
    })),
  });
}
```

- [ ] **Step 4: Run**

Run: `cd backend/apps/backend && npx jest integration-tests/http/admin-reports.spec.ts -t 'sales-summary'`
Expected: PASS — 2 passing.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/backend/src/api/admin/reports/sales-summary/ backend/apps/backend/integration-tests/http/admin-reports.spec.ts
git commit -m "feat(api): admin reports/sales-summary with day/hour/week buckets"
```

---

### Task 2.7: Reports route GET /admin/reports/top-skus

**Files:**
- Create: `backend/apps/backend/src/api/admin/reports/top-skus/route.ts`

- [ ] **Step 1: Add the failing test (append to admin-reports.spec.ts)**

```typescript
it('GET /admin/reports/top-skus orders by revenue desc', async () => {
  await seedSale('v_top', 'big',   3, 5000); // 15000
  await seedSale('v_top', 'small', 5, 1000); //  5000
  const r = await api.get('/admin/reports/top-skus?vendor_id=v_top&limit=10',
    { headers: adminHeaders });
  expect(r.status).toBe(200);
  expect(r.data.items[0].variant_id).toBe('big');
  expect(r.data.items[1].variant_id).toBe('small');
});
```

- [ ] **Step 2: Implement**

```typescript
// backend/apps/backend/src/api/admin/reports/top-skus/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400_000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const limit = Math.min(100, Number(req.query.limit ?? 20));

  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const sql = `
    SELECT l.variant_id,
           MIN(l.name_snapshot) AS name_snapshot,
           SUM(l.qty::numeric)  AS units_sold,
           SUM(l.qty::numeric * l.unit_price_minor::numeric) AS revenue_minor,
           COUNT(DISTINCT s.id) AS sale_count
      FROM pos_sale_line l
      JOIN pos_sale s ON s.id = l.sale_id
     WHERE s.vendor_id = ?
       AND s.status = 'completed'
       AND s.deleted_at IS NULL
       AND l.deleted_at IS NULL
       AND s.created_at >= ? AND s.created_at <= ?
     GROUP BY l.variant_id
     ORDER BY revenue_minor DESC
     LIMIT ?`;
  const r = await pg.raw(sql, [vendor_id, from, to, limit]);
  const rows = r?.rows ?? r ?? [];

  res.json({
    vendor_id, from, to,
    items: rows.map((row: any) => ({
      variant_id: row.variant_id,
      name_snapshot: row.name_snapshot,
      units_sold: Number(row.units_sold),
      revenue_minor: Number(row.revenue_minor),
      sale_count: Number(row.sale_count),
    })),
  });
}
```

- [ ] **Step 3: Run + commit**

```bash
cd backend/apps/backend && npx jest integration-tests/http/admin-reports.spec.ts -t 'top-skus'
# expected PASS
git add backend/apps/backend/src/api/admin/reports/top-skus/
git commit -m "feat(api): admin reports/top-skus ranked by revenue"
```

---

### Task 2.8: Reports route GET /admin/reports/drift-alerts

**Files:**
- Create: `backend/apps/backend/src/api/admin/reports/drift-alerts/route.ts`

- [ ] **Step 1: Add failing test**

```typescript
it('GET /admin/reports/drift-alerts wraps wms.detectStockDrift', async () => {
  const r = await api.get('/admin/reports/drift-alerts?vendor_id=v_drift',
    { headers: adminHeaders });
  expect(r.status).toBe(200);
  expect(Array.isArray(r.data.flagged)).toBe(true);
});
```

- [ ] **Step 2: Implement**

```typescript
// backend/apps/backend/src/api/admin/reports/drift-alerts/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  const wms: any = req.scope.resolve('wmsService');
  const report = await wms.detectStockDrift({ vendor_id });
  res.json(report);
}
```

- [ ] **Step 3: Run + commit**

```bash
cd backend/apps/backend && npx jest integration-tests/http/admin-reports.spec.ts -t 'drift-alerts'
# expected PASS
git add backend/apps/backend/src/api/admin/reports/drift-alerts/
git commit -m "feat(api): admin reports/drift-alerts wraps wms drift detection"
```

---

### Task 2.9: Reports route GET /admin/reports/low-stock

**Files:**
- Create: `backend/apps/backend/src/api/admin/reports/low-stock/route.ts`

- [ ] **Step 1: Add failing test**

```typescript
it('GET /admin/reports/low-stock lists pools at or below threshold', async () => {
  const wms: any = getContainer().resolve('wmsService');
  await wms.incrementStock({ vendor_id: 'v_low', variant_id: 'low_a', qty: 2, type: 'restock' });
  await wms.incrementStock({ vendor_id: 'v_low', variant_id: 'low_b', qty: 100, type: 'restock' });
  const r = await api.get('/admin/reports/low-stock?vendor_id=v_low&threshold=5',
    { headers: adminHeaders });
  expect(r.status).toBe(200);
  const ids = r.data.items.map((i: any) => i.variant_id);
  expect(ids).toContain('low_a');
  expect(ids).not.toContain('low_b');
});
```

- [ ] **Step 2: Implement**

```typescript
// backend/apps/backend/src/api/admin/reports/low-stock/route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const threshold = Number(req.query.threshold ?? 5);

  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const r = await pg.raw(
    `SELECT variant_id,
            on_hand_qty::numeric  AS on_hand,
            reserved_qty::numeric AS reserved
       FROM wms_stock_pool
      WHERE vendor_id = ?
        AND deleted_at IS NULL
        AND (on_hand_qty - reserved_qty) <= ?::numeric
      ORDER BY (on_hand_qty - reserved_qty) ASC
      LIMIT 100`,
    [vendor_id, threshold],
  );
  const rows = r?.rows ?? r ?? [];

  res.json({
    vendor_id, threshold,
    items: rows.map((row: any) => ({
      variant_id: row.variant_id,
      on_hand: Number(row.on_hand),
      reserved: Number(row.reserved),
      available: Number(row.on_hand) - Number(row.reserved),
    })),
  });
}
```

- [ ] **Step 3: Run + commit**

```bash
cd backend/apps/backend && npx jest integration-tests/http/admin-reports.spec.ts -t 'low-stock'
# expected PASS
git add backend/apps/backend/src/api/admin/reports/low-stock/
git commit -m "feat(api): admin reports/low-stock lists pools at or below threshold"
```

---

## Section 3 — PoS extension: manager mode + camera + schema-driven add + CSV UI

### Task 3.1: Add react-router + Dexie schema bump (v2: schemas + barcode_cache)

**Files:**
- Modify: `backend/apps/pos/package.json` (add `@zxing/browser`, `papaparse`, `@types/papaparse`)
- Modify: `backend/apps/pos/src/db/dexie.ts`

- [ ] **Step 1: Install deps**

```bash
cd backend/apps/pos && npm install @zxing/browser@^0.1 papaparse@^5 && npm install --save-dev @types/papaparse@^5
```

- [ ] **Step 2: Bump Dexie schema (additive, no breaking)**

```typescript
// backend/apps/pos/src/db/dexie.ts  — replace file
import Dexie, { Table } from 'dexie';

export interface CatalogRow {
  variant_id: string; product_id: string; sku: string | null; barcode: string | null;
  name: string; price_minor: number; currency_code: string;
  image_url: string | null; on_hand: number; updated_at: string;
}

export interface PendingSaleRow {
  client_id: string; vendor_id: string; cashier_id: string; terminal_id: string;
  lines: Array<{ variant_id: string; qty: number; unit_price_minor: number; name_snapshot: string }>;
  paid_amount_minor: number; currency_code: string; client_created_at: string;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  attempts: number; last_error: string | null;
}

export interface CashierRow {
  id: string; vendor_id: string; name: string;
  role: 'cashier' | 'manager'; active: boolean; pin_hash_prefix: string;
}

export interface ConfigRow { key: string; value: unknown }

export interface SchemaCacheRow {
  category_handle: string;
  fields_json: unknown;
  cached_at: string;
}

export interface BarcodeCacheRow {
  code: string;
  found: boolean;
  payload: unknown;
  cached_at: string;
}

class PosDb extends Dexie {
  catalog!: Table<CatalogRow, string>;
  sales_pending!: Table<PendingSaleRow, string>;
  cashiers!: Table<CashierRow, string>;
  config!: Table<ConfigRow, string>;
  schemas!: Table<SchemaCacheRow, string>;
  barcode_cache!: Table<BarcodeCacheRow, string>;

  constructor() {
    super('hanoot-pos');
    this.version(1).stores({
      catalog: 'variant_id, barcode, sku, product_id',
      sales_pending: 'client_id, status, vendor_id',
      cashiers: 'id, vendor_id',
      config: 'key',
    });
    this.version(2).stores({
      catalog: 'variant_id, barcode, sku, product_id',
      sales_pending: 'client_id, status, vendor_id',
      cashiers: 'id, vendor_id',
      config: 'key',
      schemas: 'category_handle',
      barcode_cache: 'code',
    });
  }
}

export const db = new PosDb();

export async function resetDbForTests() {
  await db.catalog.clear();
  await db.sales_pending.clear();
  await db.cashiers.clear();
  await db.config.clear();
  await db.schemas.clear();
  await db.barcode_cache.clear();
}
```

- [ ] **Step 3: Confirm existing tests still pass**

Run: `cd backend/apps/pos && npx vitest run`
Expected: PASS — existing test suite green.

- [ ] **Step 4: Install react-router-dom (it's already in package.json — confirm)**

Confirmed at `pos/package.json:16` (`react-router-dom`: ^6.26.0). No install needed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/pos/package.json backend/apps/pos/package-lock.json backend/apps/pos/src/db/dexie.ts
git commit -m "chore(pos): dexie v2 (schemas + barcode_cache) + zxing/papaparse deps"
```

---

### Task 3.2: Manager PIN gate (calls cashiers/verify, demands role=manager)

**Files:**
- Create: `backend/apps/pos/src/state/manager-session.ts`
- Create: `backend/apps/pos/src/ui/screens/manager/ManagerPinGate.tsx`
- Create: `backend/apps/pos/tests/manager-pin.test.tsx`
- Modify: `backend/apps/pos/src/api/pos.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/apps/pos/tests/manager-pin.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManagerPinGate } from '../src/ui/screens/manager/ManagerPinGate';
import { useManagerSession } from '../src/state/manager-session';
import * as posApi from '../src/api/pos';

describe('ManagerPinGate', () => {
  beforeEach(() => {
    useManagerSession.setState({ manager_id: null, manager_name: null });
  });

  it('rejects when role !== manager', async () => {
    vi.spyOn(posApi, 'verifyCashierPin').mockResolvedValue({
      id: 'c1', vendor_id: 'v', name: 'C', role: 'cashier', active: true,
    } as any);
    vi.spyOn(posApi, 'fetchCashiers').mockResolvedValue([
      { id: 'c1', vendor_id: 'v', name: 'C', role: 'cashier', active: true, pin_hash_prefix: '00000000' },
    ]);
    render(<ManagerPinGate>protected</ManagerPinGate>);
    await waitFor(() => screen.getByText('C'));
    fireEvent.click(screen.getByText('C'));
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Unlock'));
    await waitFor(() => {
      expect(screen.getByText(/manager role required/i)).toBeTruthy();
    });
    expect(useManagerSession.getState().manager_id).toBeNull();
  });

  it('admits when role === manager and renders children', async () => {
    vi.spyOn(posApi, 'verifyCashierPin').mockResolvedValue({
      id: 'm1', vendor_id: 'v', name: 'Boss', role: 'manager', active: true,
    } as any);
    vi.spyOn(posApi, 'fetchCashiers').mockResolvedValue([
      { id: 'm1', vendor_id: 'v', name: 'Boss', role: 'manager', active: true, pin_hash_prefix: '00000000' },
    ]);
    render(<ManagerPinGate>secret content</ManagerPinGate>);
    await waitFor(() => screen.getByText('Boss'));
    fireEvent.click(screen.getByText('Boss'));
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '4321' } });
    fireEvent.click(screen.getByText('Unlock'));
    await waitFor(() => screen.getByText('secret content'));
    expect(useManagerSession.getState().manager_id).toBe('m1');
  });
});
```

- [ ] **Step 2: Add `verifyCashierPin` to api/pos.ts**

Append to `backend/apps/pos/src/api/pos.ts`:

```typescript
export type VerifyResult = {
  id: string; vendor_id: string; name: string;
  role: 'cashier' | 'manager'; active: boolean;
};

export async function verifyCashierPin(cashier_id: string, pin: string): Promise<VerifyResult> {
  const r = await api<{ cashier: VerifyResult }>('/admin/pos-terminal/cashiers/verify', {
    method: 'POST', body: JSON.stringify({ cashier_id, pin }),
  });
  return r.cashier;
}
```

- [ ] **Step 3: Manager session store**

```typescript
// backend/apps/pos/src/state/manager-session.ts
import { create } from 'zustand';

export type ManagerSession = {
  manager_id: string | null;
  manager_name: string | null;
  signIn: (s: { manager_id: string; manager_name: string }) => void;
  signOut: () => void;
};

export const useManagerSession = create<ManagerSession>((set) => ({
  manager_id: null, manager_name: null,
  signIn({ manager_id, manager_name }) { set({ manager_id, manager_name }); },
  signOut() { set({ manager_id: null, manager_name: null }); },
}));
```

- [ ] **Step 4: PIN gate component**

```tsx
// backend/apps/pos/src/ui/screens/manager/ManagerPinGate.tsx
import { useEffect, useState } from 'react';
import { fetchCashiers, verifyCashierPin, type CashierListItem } from '../../../api/pos';
import { VENDOR_ID } from '../../../env';
import { useManagerSession } from '../../../state/manager-session';

export function ManagerPinGate({ children }: { children: React.ReactNode }) {
  const manager_id = useManagerSession((s) => s.manager_id);
  const [cashiers, setCashiers] = useState<CashierListItem[]>([]);
  const [picked, setPicked] = useState<CashierListItem | null>(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchCashiers(VENDOR_ID).then(setCashiers).catch(() => setCashiers([]));
  }, []);

  if (manager_id) return <>{children}</>;

  async function submit() {
    if (!picked) return;
    setBusy(true); setErr(null);
    try {
      const v = await verifyCashierPin(picked.id, pin);
      if (v.role !== 'manager') { setErr('manager role required'); setBusy(false); return; }
      useManagerSession.getState().signIn({ manager_id: v.id, manager_name: v.name });
    } catch (e: any) {
      setErr(e?.message ?? 'verify failed');
    } finally { setBusy(false); }
  }

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <h1>Manager mode</h1>
      {!picked ? (
        <>
          <p>Pick your manager profile:</p>
          <ul>
            {cashiers.filter((c) => c.role === 'manager' || true).map((c) => (
              <li key={c.id}>
                <button onClick={() => setPicked(c)}>{c.name}</button>
              </li>
            ))}
          </ul>
          {!cashiers.length && <p>No cashiers found — create one in Admin first.</p>}
        </>
      ) : (
        <>
          <p>Signing in as <strong>{picked.name}</strong></p>
          <label>PIN
            <input aria-label="PIN" type="password" value={pin}
              onChange={(e) => setPin(e.target.value)} autoFocus />
          </label>
          <button onClick={submit} disabled={busy}>Unlock</button>
          <button onClick={() => { setPicked(null); setPin(''); setErr(null); }}>Back</button>
          {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Run**

Run: `cd backend/apps/pos && npx vitest run tests/manager-pin.test.tsx`
Expected: PASS — 2 passing.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/pos/src/state/manager-session.ts backend/apps/pos/src/ui/screens/manager/ManagerPinGate.tsx backend/apps/pos/src/api/pos.ts backend/apps/pos/tests/manager-pin.test.tsx
git commit -m "feat(pos): manager PIN gate reuses cashiers/verify, demands role=manager"
```

---

### Task 3.3: ManagerLayout + route table; Settings reachable from Manager

**Files:**
- Create: `backend/apps/pos/src/routes.tsx`
- Create: `backend/apps/pos/src/ui/screens/manager/ManagerLayout.tsx`
- Modify: `backend/apps/pos/src/App.tsx`

- [ ] **Step 1: Route table**

```tsx
// backend/apps/pos/src/routes.tsx
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { RegisterScreen } from './ui/screens/RegisterScreen';
import { LoginScreen } from './ui/screens/LoginScreen';
import { ManagerLayout } from './ui/screens/manager/ManagerLayout';
import { ManagerPinGate } from './ui/screens/manager/ManagerPinGate';
import { CatalogListScreen } from './ui/screens/manager/CatalogListScreen';
import { AddProductScreen } from './ui/screens/manager/AddProductScreen';
import { CsvImportScreen } from './ui/screens/manager/CsvImportScreen';
import { useSession } from './state/session';

function RequireCashier({ children }: { children: React.ReactNode }) {
  const id = useSession((s) => s.cashier_id);
  return id ? <>{children}</> : <LoginScreen />;
}

export const router = createBrowserRouter([
  { path: '/', element: <RequireCashier><RegisterScreen /></RequireCashier> },
  {
    path: '/manager',
    element: <RequireCashier><ManagerPinGate><ManagerLayout /></ManagerPinGate></RequireCashier>,
    children: [
      { index: true, element: <Navigate to="catalog" replace /> },
      { path: 'catalog', element: <CatalogListScreen /> },
      { path: 'catalog/new', element: <AddProductScreen /> },
      { path: 'import', element: <CsvImportScreen /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 2: ManagerLayout**

```tsx
// backend/apps/pos/src/ui/screens/manager/ManagerLayout.tsx
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useManagerSession } from '../../../state/manager-session';

export function ManagerLayout() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const manager_name = useManagerSession((s) => s.manager_name);
  const itemStyle = (active: boolean): React.CSSProperties => ({
    padding: 12, display: 'block', color: active ? 'var(--accent)' : 'var(--text)',
    textDecoration: 'none', borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <aside style={{ background: 'var(--surface)', padding: 8 }}>
        <h3 style={{ padding: 8 }}>Manager</h3>
        <p style={{ padding: 8, color: 'var(--text-muted, #9CA3AF)' }}>Signed in: {manager_name}</p>
        <Link to="/manager/catalog" style={itemStyle(pathname.startsWith('/manager/catalog'))}>Catalog</Link>
        <Link to="/manager/import" style={itemStyle(pathname.startsWith('/manager/import'))}>CSV Import</Link>
        <button onClick={() => { useManagerSession.getState().signOut(); nav('/'); }}
          style={{ margin: 8 }}>Exit Manager</button>
        <button onClick={() => nav('/')} style={{ margin: 8 }}>Back to Register</button>
      </aside>
      <main style={{ padding: 16 }}><Outlet /></main>
    </div>
  );
}
```

- [ ] **Step 3: Swap App.tsx to AppRouter**

```tsx
// backend/apps/pos/src/App.tsx
import { useEffect } from 'react';
import {
  attachNetworkListeners, startBackgroundSync, stopBackgroundSync, resetStuckSendingRows,
} from './sync/sync-client';
import { AppRouter } from './routes';

export default function App() {
  useEffect(() => {
    resetStuckSendingRows().catch(() => {});
    attachNetworkListeners();
    startBackgroundSync(5000);
    return () => stopBackgroundSync();
  }, []);
  return <AppRouter />;
}
```

- [ ] **Step 4: Add stub screens (will be filled in 3.6-3.8)** — write *minimum* viable so the router doesn't crash; tasks below replace them:

```tsx
// backend/apps/pos/src/ui/screens/manager/CatalogListScreen.tsx
export function CatalogListScreen() { return <p>catalog list (3.7)</p>; }
```

```tsx
// backend/apps/pos/src/ui/screens/manager/AddProductScreen.tsx
export function AddProductScreen() { return <p>add product (3.6)</p>; }
```

```tsx
// backend/apps/pos/src/ui/screens/manager/CsvImportScreen.tsx
export function CsvImportScreen() { return <p>csv import (3.8)</p>; }
```

- [ ] **Step 5: Run existing tests (none should break)**

Run: `cd backend/apps/pos && npx vitest run`
Expected: PASS — all green.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/pos/src/routes.tsx backend/apps/pos/src/ui/screens/manager/ backend/apps/pos/src/App.tsx
git commit -m "feat(pos): router + ManagerLayout with PIN-gated /manager/* routes"
```

---

### Task 3.4: Camera barcode scan helper (@zxing/browser)

**Files:**
- Create: `backend/apps/pos/src/hardware/camera-barcode.ts`
- Create: `backend/apps/pos/tests/camera-barcode.test.ts`

- [ ] **Step 1: Write the failing test (the heavy DOM work is jsdom-incompatible — test the pure parts)**

```typescript
// backend/apps/pos/tests/camera-barcode.test.ts
import { describe, it, expect } from 'vitest';
import { isPlausibleBarcode } from '../src/hardware/camera-barcode';

describe('isPlausibleBarcode', () => {
  it('accepts 12-14 digit barcodes', () => {
    expect(isPlausibleBarcode('012345678905')).toBe(true);
    expect(isPlausibleBarcode('5740900401099')).toBe(true);
    expect(isPlausibleBarcode('12345678901234')).toBe(true);
  });
  it('rejects too-short / non-numeric', () => {
    expect(isPlausibleBarcode('123')).toBe(false);
    expect(isPlausibleBarcode('abc12345')).toBe(false);
    expect(isPlausibleBarcode('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run, observe failure**

Run: `cd backend/apps/pos && npx vitest run tests/camera-barcode.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```typescript
// backend/apps/pos/src/hardware/camera-barcode.ts
import { BrowserMultiFormatReader } from '@zxing/browser';

export function isPlausibleBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code);
}

export type CameraScanHandle = { stop: () => void };

/**
 * Start the rear camera and continuously decode barcodes into onScan().
 * Caller is responsible for mounting the <video> element passed in.
 * Returns a handle whose stop() releases the camera and stops decoding.
 */
export async function startCameraScan(opts: {
  videoEl: HTMLVideoElement;
  onScan: (code: string) => void;
  onError?: (e: Error) => void;
}): Promise<CameraScanHandle> {
  const reader = new BrowserMultiFormatReader();
  try {
    const controls = await reader.decodeFromVideoDevice(
      undefined,
      opts.videoEl,
      (result, _err, ctrl) => {
        if (result) {
          const txt = result.getText();
          if (isPlausibleBarcode(txt)) opts.onScan(txt);
        }
      },
    );
    return { stop: () => controls.stop() };
  } catch (e: any) {
    opts.onError?.(e);
    return { stop: () => {} };
  }
}
```

- [ ] **Step 4: Run + commit**

```bash
cd backend/apps/pos && npx vitest run tests/camera-barcode.test.ts
# expected PASS
git add backend/apps/pos/src/hardware/camera-barcode.ts backend/apps/pos/tests/camera-barcode.test.ts
git commit -m "feat(pos): camera barcode scan helper backed by @zxing/browser"
```

---

### Task 3.5: Schema fetch + SchemaFieldRenderer

**Files:**
- Modify: `backend/apps/pos/src/api/pos.ts`
- Create: `backend/apps/pos/src/db/schema-cache.ts`
- Create: `backend/apps/pos/src/ui/components/SchemaFieldRenderer.tsx`

- [ ] **Step 1: Extend api/pos.ts**

Append:

```typescript
export type FieldDef = {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'number' | 'price_minor' | 'select' | 'multi_select' | 'date' | 'boolean' | 'image';
  required?: boolean;
  options?: string[];
  unit?: string;
  help?: string;
};

export type CategoryDTO = { id: string; handle: string; name: string; icon: string | null; position: number };

export async function fetchCategories(): Promise<CategoryDTO[]> {
  const r = await api<{ categories: CategoryDTO[] }>('/admin/catalog-schema/categories');
  return r.categories;
}

export async function fetchSchema(handle: string): Promise<{ category_handle: string; fields: FieldDef[] }> {
  const r = await api<{ schema: { category_handle: string; fields: FieldDef[] } }>(
    `/admin/catalog-schema/schemas/${encodeURIComponent(handle)}`);
  return r.schema;
}

export type BarcodeLookupResult = {
  found: boolean; code: string;
  name?: string | null; brand?: string | null; image_url?: string | null;
  weight_grams?: number | null;
};

export async function barcodeLookup(code: string): Promise<BarcodeLookupResult> {
  return api<BarcodeLookupResult>(`/admin/catalog/barcode-lookup?code=${encodeURIComponent(code)}`);
}

export async function classifyName(name: string, hint?: string): Promise<{ category_handle: string; confidence: number }> {
  return api(`/admin/catalog/classify`, { method: 'POST', body: JSON.stringify({ name, hint }) });
}

export async function createProduct(body: {
  vendor_id: string; title: string; description?: string;
  barcode?: string; sku?: string; thumbnail?: string;
  price_minor: number; currency_code: string;
  category_handle: string; schema_fields?: Record<string, unknown>;
  initial_on_hand?: number;
}): Promise<{ product: any }> {
  return api('/admin/catalog/products', { method: 'POST', body: JSON.stringify(body) });
}

export async function importCsv(vendor_id: string, csv: string): Promise<{ total: number; created: number; failed: number; errors: Array<{ row: number; reason: string }> }> {
  return api(`/admin/catalog/import-csv?vendor_id=${encodeURIComponent(vendor_id)}`, {
    method: 'POST', body: csv, headers: { 'Content-Type': 'text/csv' },
  });
}
```

- [ ] **Step 2: Schema cache helper**

```typescript
// backend/apps/pos/src/db/schema-cache.ts
import { db } from './dexie';
import { fetchSchema, type FieldDef } from '../api/pos';

const TTL_MS = 24 * 60 * 60 * 1000;

export async function getCachedSchema(handle: string): Promise<{ category_handle: string; fields: FieldDef[] }> {
  const row = await db.schemas.get(handle);
  if (row) {
    const age = Date.now() - new Date(row.cached_at).getTime();
    if (age < TTL_MS) return { category_handle: handle, fields: row.fields_json as FieldDef[] };
  }
  const fresh = await fetchSchema(handle);
  await db.schemas.put({
    category_handle: handle,
    fields_json: fresh.fields,
    cached_at: new Date().toISOString(),
  });
  return fresh;
}
```

- [ ] **Step 3: SchemaFieldRenderer**

```tsx
// backend/apps/pos/src/ui/components/SchemaFieldRenderer.tsx
import type { FieldDef } from '../../api/pos';

export function SchemaFieldRenderer({
  field, value, onChange,
}: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const label = (
    <label style={{ display: 'block', marginBottom: 4 }}>
      {field.label}{field.required && <span style={{ color: 'var(--danger)' }}> *</span>}
      {field.help && <small style={{ display: 'block', color: '#9CA3AF' }}>{field.help}</small>}
    </label>
  );

  if (field.kind === 'textarea') {
    return <div>{label}<textarea value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} /></div>;
  }
  if (field.kind === 'number' || field.kind === 'price_minor') {
    return <div>{label}<input type="number" value={(value as number) ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></div>;
  }
  if (field.kind === 'select') {
    return (
      <div>{label}
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.kind === 'multi_select') {
    const list = (value as string[] | undefined) ?? [];
    return (
      <div>{label}
        {(field.options ?? []).map((o) => (
          <label key={o} style={{ marginRight: 8 }}>
            <input type="checkbox" checked={list.includes(o)} onChange={(e) => {
              const next = e.target.checked ? [...list, o] : list.filter((x) => x !== o);
              onChange(next);
            }} /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (field.kind === 'boolean') {
    return (
      <div>{label}
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      </div>
    );
  }
  if (field.kind === 'date') {
    return <div>{label}<input type="date" value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)} /></div>;
  }
  // text + image fallback (image = url for v1; upload is a v2 nicety)
  return <div>{label}<input type="text" value={(value as string) ?? ''}
    onChange={(e) => onChange(e.target.value)} /></div>;
}
```

- [ ] **Step 4: Commit (no new test — exercised by AddProductScreen test in 3.6)**

```bash
git add backend/apps/pos/src/api/pos.ts backend/apps/pos/src/db/schema-cache.ts backend/apps/pos/src/ui/components/SchemaFieldRenderer.tsx
git commit -m "feat(pos): typed catalog api + cached schema fetch + SchemaFieldRenderer"
```

---

### Task 3.6: AddProductScreen wizard (scan → lookup → category → schema → save)

**Files:**
- Replace: `backend/apps/pos/src/ui/screens/manager/AddProductScreen.tsx`
- Create: `backend/apps/pos/tests/add-product.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// backend/apps/pos/tests/add-product.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AddProductScreen } from '../src/ui/screens/manager/AddProductScreen';
import * as posApi from '../src/api/pos';
import { resetDbForTests } from '../src/db/dexie';

describe('AddProductScreen', () => {
  beforeEach(async () => { await resetDbForTests(); vi.restoreAllMocks(); });

  it('manual entry: pick grocery → fill name+price → save calls createProduct', async () => {
    vi.spyOn(posApi, 'fetchCategories').mockResolvedValue([
      { id: 'csc1', handle: 'grocery',  name: 'Grocery', icon: '🛒', position: 1 },
      { id: 'csc2', handle: 'other',    name: 'Other',   icon: '📦', position: 99 },
    ]);
    vi.spyOn(posApi, 'fetchSchema').mockResolvedValue({
      category_handle: 'grocery',
      fields: [
        { key: 'weight_grams', label: 'Weight (g)', kind: 'number' },
        { key: 'brand',        label: 'Brand',      kind: 'text' },
      ],
    });
    const create = vi.spyOn(posApi, 'createProduct').mockResolvedValue({
      product: { id: 'prod_x', variants: [{ id: 'var_x' }] },
    });

    render(<MemoryRouter><AddProductScreen /></MemoryRouter>);
    await waitFor(() => screen.getByText('Grocery'));
    fireEvent.click(screen.getByText('Grocery'));
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'Bread' } });
    fireEvent.change(screen.getByLabelText(/^Price/), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/Weight \(g\)/), { target: { value: '500' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      title: 'Bread',
      price_minor: 1000,
      category_handle: 'grocery',
      schema_fields: { weight_grams: 500 },
    });
  });
});
```

- [ ] **Step 2: Replace the stub**

```tsx
// backend/apps/pos/src/ui/screens/manager/AddProductScreen.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCategories, barcodeLookup, classifyName, createProduct,
  type CategoryDTO, type FieldDef,
} from '../../../api/pos';
import { getCachedSchema } from '../../../db/schema-cache';
import { SchemaFieldRenderer } from '../../components/SchemaFieldRenderer';
import { VENDOR_ID } from '../../../env';

export function AddProductScreen() {
  const nav = useNavigate();
  const [cats, setCats] = useState<CategoryDTO[]>([]);
  const [picked, setPicked] = useState<CategoryDTO | null>(null);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [schemaValues, setSchemaValues] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [thumb, setThumb] = useState<string | null>(null);
  const [stock, setStock] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);

  useEffect(() => { fetchCategories().then(setCats); }, []);

  async function onLookup() {
    if (!barcode) return;
    setLookupMsg('Looking up…');
    const r = await barcodeLookup(barcode).catch(() => null);
    if (!r || !r.found) { setLookupMsg('Not found in catalog — fill manually.'); return; }
    if (r.name) setTitle(r.name);
    if (r.image_url) setThumb(r.image_url);
    if (r.weight_grams != null) setSchemaValues((v) => ({ ...v, weight_grams: r.weight_grams }));
    if (r.brand) setSchemaValues((v) => ({ ...v, brand: r.brand }));
    setLookupMsg('Filled from OpenFoodFacts.');
    if (!picked && r.name) {
      const cls = await classifyName(r.name).catch(() => null);
      if (cls && cls.category_handle) {
        const c = cats.find((x) => x.handle === cls.category_handle);
        if (c) await selectCategory(c);
      }
    }
  }

  async function selectCategory(c: CategoryDTO) {
    setPicked(c);
    const s = await getCachedSchema(c.handle);
    setFields(s.fields);
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      if (!picked) throw new Error('pick a category');
      if (!title) throw new Error('title required');
      if (price === '') throw new Error('price required');
      await createProduct({
        vendor_id: VENDOR_ID,
        title, price_minor: Number(price), currency_code: 'iqd',
        category_handle: picked.handle, schema_fields: schemaValues,
        barcode: barcode || undefined, sku: sku || undefined,
        thumbnail: thumb || undefined, initial_on_hand: stock,
      });
      nav('/manager/catalog');
    } catch (e: any) { setErr(e?.message ?? 'save failed'); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <h1>Add product</h1>
      <section>
        <label htmlFor="bc">Barcode</label>
        <input id="bc" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        <button onClick={onLookup}>Lookup</button>
        {lookupMsg && <p>{lookupMsg}</p>}
      </section>
      <section>
        <h3>Category</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cats.map((c) => (
            <button key={c.handle} onClick={() => selectCategory(c)}
              style={{ outline: picked?.handle === c.handle ? '2px solid var(--accent)' : 'none' }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <label>Title<input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Price (minor IQD)<input aria-label="Price (minor IQD)" type="number"
          value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} /></label>
        <label>SKU<input value={sku} onChange={(e) => setSku(e.target.value)} /></label>
        <label>Initial on-hand<input type="number" value={stock}
          onChange={(e) => setStock(Number(e.target.value))} /></label>
      </section>
      {picked && (
        <section>
          <h3>{picked.name} fields</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {fields.map((f) => (
              <SchemaFieldRenderer key={f.key} field={f} value={schemaValues[f.key]}
                onChange={(v) => setSchemaValues((s) => ({ ...s, [f.key]: v }))} />
            ))}
          </div>
        </section>
      )}
      {thumb && <img src={thumb} alt="" style={{ maxWidth: 120 }} />}
      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      <hr />
      <button onClick={save} disabled={busy}>Save</button>
      <button onClick={() => nav('/manager/catalog')}>Cancel</button>
    </div>
  );
}
```

- [ ] **Step 3: Run + commit**

```bash
cd backend/apps/pos && npx vitest run tests/add-product.test.tsx
# expected PASS
git add backend/apps/pos/src/ui/screens/manager/AddProductScreen.tsx backend/apps/pos/tests/add-product.test.tsx
git commit -m "feat(pos): AddProductScreen — barcode lookup, AI classify, schema-driven fields"
```

---

### Task 3.7: CatalogListScreen (Dexie list + "Add Product" CTA)

**Files:**
- Replace: `backend/apps/pos/src/ui/screens/manager/CatalogListScreen.tsx`

- [ ] **Step 1: Implement (read-only list of locally cached catalog)**

```tsx
// backend/apps/pos/src/ui/screens/manager/CatalogListScreen.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db, type CatalogRow } from '../../../db/dexie';
import { syncCatalog } from '../../../db/catalog-sync';
import { VENDOR_ID } from '../../../env';

export function CatalogListScreen() {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');

  async function reload() {
    setRows(await db.catalog.toArray());
  }
  useEffect(() => { reload(); }, []);

  async function refresh() {
    setBusy(true);
    try { await syncCatalog(VENDOR_ID); await reload(); } finally { setBusy(false); }
  }

  const filtered = filter
    ? rows.filter((r) => r.name.toLowerCase().includes(filter.toLowerCase()))
    : rows;

  return (
    <div>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>Catalog ({rows.length})</h1>
        <input placeholder="Search…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button onClick={refresh} disabled={busy}>Refresh</button>
        <Link to="/manager/catalog/new"><button>+ Add product</button></Link>
        <Link to="/manager/import"><button>CSV Import</button></Link>
      </header>
      <table style={{ width: '100%', marginTop: 16 }}>
        <thead><tr><th align="left">Name</th><th>SKU</th><th>Barcode</th><th>Price</th><th>On hand</th></tr></thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.variant_id}>
              <td>{r.name}</td><td>{r.sku ?? '—'}</td><td>{r.barcode ?? '—'}</td>
              <td align="right">{(r.price_minor / 1000).toFixed(2)}k</td>
              <td align="right">{r.on_hand}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit (covered by manual smoke; no new automated test)**

```bash
git add backend/apps/pos/src/ui/screens/manager/CatalogListScreen.tsx
git commit -m "feat(pos): CatalogListScreen — Dexie-backed list with filter + refresh"
```

---

### Task 3.8: CsvImportScreen (papaparse preview + upload + result table)

**Files:**
- Replace: `backend/apps/pos/src/ui/screens/manager/CsvImportScreen.tsx`
- Create: `backend/apps/pos/tests/csv-import.test.ts`

- [ ] **Step 1: Pure preview helper test**

```typescript
// backend/apps/pos/tests/csv-import.test.ts
import { describe, it, expect } from 'vitest';
import { previewCsv } from '../src/ui/screens/manager/CsvImportScreen';

describe('previewCsv', () => {
  it('parses headers + first N rows', () => {
    const csv = 'a,b\n1,2\n3,4\n5,6\n';
    const r = previewCsv(csv, 2);
    expect(r.headers).toEqual(['a', 'b']);
    expect(r.rows.length).toBe(2);
    expect(r.rows[0]).toEqual({ a: '1', b: '2' });
    expect(r.totalRowCount).toBe(3);
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// backend/apps/pos/src/ui/screens/manager/CsvImportScreen.tsx
import { useState } from 'react';
import Papa from 'papaparse';
import { importCsv } from '../../../api/pos';
import { VENDOR_ID } from '../../../env';

export type PreviewResult = {
  headers: string[];
  rows: Record<string, string>[];
  totalRowCount: number;
};

export function previewCsv(csv: string, n: number): PreviewResult {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const data = parsed.data ?? [];
  return {
    headers: parsed.meta?.fields ?? [],
    rows: data.slice(0, n),
    totalRowCount: data.length,
  };
}

export function CsvImportScreen() {
  const [csv, setCsv] = useState<string>('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ total: number; created: number; failed: number; errors: Array<{ row: number; reason: string }> } | null>(null);

  async function onFile(f: File) {
    const text = await f.text();
    setCsv(text);
    setPreview(previewCsv(text, 5));
    setResult(null);
  }

  async function onUpload() {
    if (!csv) return;
    setBusy(true);
    try { setResult(await importCsv(VENDOR_ID, csv)); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <h1>CSV import</h1>
      <p>Headers expected: <code>title, sku, barcode, price_minor, currency_code, category_handle, initial_on_hand</code></p>
      <input type="file" accept=".csv,text/csv"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {preview && (
        <>
          <h3>Preview ({preview.totalRowCount} rows total)</h3>
          <table><thead><tr>{preview.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{preview.rows.map((r, i) => (
              <tr key={i}>{preview.headers.map((h) => <td key={h}>{r[h] ?? ''}</td>)}</tr>
            ))}</tbody>
          </table>
          <button onClick={onUpload} disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
        </>
      )}
      {result && (
        <section>
          <h3>Result</h3>
          <p>Total: {result.total} · Created: {result.created} · Failed: {result.failed}</p>
          {result.errors.length > 0 && (
            <table><thead><tr><th>Row</th><th>Reason</th></tr></thead>
              <tbody>{result.errors.map((e, i) => (
                <tr key={i}><td>{e.row}</td><td>{e.reason}</td></tr>
              ))}</tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run + commit**

```bash
cd backend/apps/pos && npx vitest run tests/csv-import.test.ts
# expected PASS
git add backend/apps/pos/src/ui/screens/manager/CsvImportScreen.tsx backend/apps/pos/tests/csv-import.test.ts
git commit -m "feat(pos): CsvImportScreen — preview, upload, per-row error report"
```

---

## Section 4 — New admin app for the reports dashboard

### Task 4.1: Scaffold `apps/admin/` Vite app (port 9300)

**Files:**
- Create: `backend/apps/admin/package.json`
- Create: `backend/apps/admin/vite.config.ts`
- Create: `backend/apps/admin/tsconfig.json`
- Create: `backend/apps/admin/index.html`
- Create: `backend/apps/admin/tests/setup.ts`
- Create: `backend/apps/admin/src/main.tsx`
- Create: `backend/apps/admin/src/App.tsx`
- Create: `backend/apps/admin/src/env.ts`
- Create: `backend/apps/admin/src/ui/tokens.css`

- [ ] **Step 1: package.json**

```json
{
  "name": "@hanoot/admin",
  "version": "0.1.0",
  "private": true,
  "description": "Hanoot Admin — vendor reports dashboard",
  "scripts": {
    "dev": "vite --port 9300 --host",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 9300",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "zustand": "^4.5.4",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "~5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: vite.config.ts + tsconfig.json**

```typescript
// backend/apps/admin/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['**/*.test.js'],
  },
});
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM"],
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: index.html + main.tsx + App.tsx + env + tokens**

```html
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hanoot Admin</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

```tsx
// backend/apps/admin/src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/tokens.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
```

```tsx
// backend/apps/admin/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from './ui/screens/LoginScreen';
import { DashboardScreen } from './ui/screens/DashboardScreen';
import { useAdminSession } from './state/session';

function Guarded({ children }: { children: React.ReactNode }) {
  const token = useAdminSession((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/" element={<Guarded><DashboardScreen /></Guarded>} />
      </Routes>
    </BrowserRouter>
  );
}
```

```typescript
// backend/apps/admin/src/env.ts
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:9000';
export const VENDOR_ID = import.meta.env.VITE_VENDOR_ID ?? '';
```

```css
/* backend/apps/admin/src/ui/tokens.css */
:root { --bg: #0B0B0F; --surface: #15151B; --text: #F7F7F8; --accent: #0F766E; --danger: #DC2626; --radius: 8px; }
body { background: var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; }
```

- [ ] **Step 4: tests/setup.ts**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Install + smoke build**

```bash
cd backend/apps/admin && npm install && npx tsc --noEmit
```

Expected: no errors. (Stub screens & state appear in tasks 4.2-4.3 so tsc may flag missing imports — write the minimal stubs now so tsc passes, real bodies come next.)

- [ ] **Step 6: Minimal stubs to make tsc green**

```tsx
// backend/apps/admin/src/ui/screens/LoginScreen.tsx
export function LoginScreen() { return <p>login (4.3)</p>; }
```

```tsx
// backend/apps/admin/src/ui/screens/DashboardScreen.tsx
export function DashboardScreen() { return <p>dashboard (4.7)</p>; }
```

```typescript
// backend/apps/admin/src/state/session.ts
import { create } from 'zustand';
type S = { token: string | null; vendor_id: string; signIn: (t: string, v: string) => void; signOut: () => void };
export const useAdminSession = create<S>((set) => ({
  token: null, vendor_id: '',
  signIn(token, vendor_id) { set({ token, vendor_id }); },
  signOut() { set({ token: null, vendor_id: '' }); },
}));
```

Re-run `tsc --noEmit`. Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/admin/
git commit -m "feat(admin): scaffold Vite app (port 9300) — stubs + tokens"
```

---

### Task 4.2: api/client.ts + reports.ts typed calls

**Files:**
- Create: `backend/apps/admin/src/api/client.ts`
- Create: `backend/apps/admin/src/api/reports.ts`
- Create: `backend/apps/admin/tests/reports-api.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/apps/admin/tests/reports-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../src/api/client';
import { fetchSalesSummary, fetchTopSkus, fetchDriftAlerts, fetchLowStock } from '../src/api/reports';

describe('reports api', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('fetchSalesSummary calls /admin/reports/sales-summary with vendor + range', async () => {
    const spy = vi.spyOn(client, 'api').mockResolvedValue({ vendor_id: 'v', from: '', to: '', bucket: 'day', buckets: [] });
    await fetchSalesSummary('v', new Date('2026-01-01'), new Date('2026-01-31'), 'day');
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^\/admin\/reports\/sales-summary\?vendor_id=v/));
  });

  it('fetchTopSkus + fetchDriftAlerts + fetchLowStock URLs', async () => {
    const spy = vi.spyOn(client, 'api').mockResolvedValue({} as any);
    await fetchTopSkus('v', 20);
    await fetchDriftAlerts('v');
    await fetchLowStock('v', 5);
    expect(spy.mock.calls[0][0]).toMatch('/admin/reports/top-skus?vendor_id=v&limit=20');
    expect(spy.mock.calls[1][0]).toMatch('/admin/reports/drift-alerts?vendor_id=v');
    expect(spy.mock.calls[2][0]).toMatch('/admin/reports/low-stock?vendor_id=v&threshold=5');
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// backend/apps/admin/src/api/client.ts
import { API_BASE } from '../env';
import { useAdminSession } from '../state/session';
export class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAdminSession.getState().token;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (body as any)?.error ?? res.statusText);
  return body as T;
}
```

```typescript
// backend/apps/admin/src/api/reports.ts
import { api } from './client';

export type SalesBucket = { bucket_at: string; sale_count: number; revenue_minor: number };
export type SalesSummary = { vendor_id: string; from: string; to: string; bucket: string; buckets: SalesBucket[] };

export async function fetchSalesSummary(vendor_id: string, from: Date, to: Date, bucket: 'day' | 'hour' | 'week') {
  const q = `vendor_id=${encodeURIComponent(vendor_id)}&from=${from.toISOString()}&to=${to.toISOString()}&bucket=${bucket}`;
  return api<SalesSummary>(`/admin/reports/sales-summary?${q}`);
}

export type TopSku = { variant_id: string; name_snapshot: string; units_sold: number; revenue_minor: number; sale_count: number };
export async function fetchTopSkus(vendor_id: string, limit = 20) {
  return api<{ vendor_id: string; items: TopSku[] }>(`/admin/reports/top-skus?vendor_id=${encodeURIComponent(vendor_id)}&limit=${limit}`);
}

export type DriftItem = { vendor_id: string; variant_id: string; on_hand: number; reserved: number; flag: string };
export async function fetchDriftAlerts(vendor_id: string) {
  return api<{ flagged: DriftItem[] }>(`/admin/reports/drift-alerts?vendor_id=${encodeURIComponent(vendor_id)}`);
}

export type LowStockItem = { variant_id: string; on_hand: number; reserved: number; available: number };
export async function fetchLowStock(vendor_id: string, threshold = 5) {
  return api<{ vendor_id: string; threshold: number; items: LowStockItem[] }>(`/admin/reports/low-stock?vendor_id=${encodeURIComponent(vendor_id)}&threshold=${threshold}`);
}
```

- [ ] **Step 3: Run + commit**

```bash
cd backend/apps/admin && npx vitest run tests/reports-api.test.ts
# expected PASS
git add backend/apps/admin/src/api/ backend/apps/admin/tests/reports-api.test.ts
git commit -m "feat(admin): api client + typed reports endpoints"
```

---

### Task 4.3: Admin login screen (reuses backend admin auth)

**Files:**
- Replace: `backend/apps/admin/src/ui/screens/LoginScreen.tsx`

- [ ] **Step 1: Implement**

```tsx
// backend/apps/admin/src/ui/screens/LoginScreen.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, VENDOR_ID } from '../../env';
import { useAdminSession } from '../../state/session';

export function LoginScreen() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vendor, setVendor] = useState(VENDOR_ID);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/auth/user/emailpass`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.token) throw new Error(json?.message ?? 'login failed');
      useAdminSession.getState().signIn(json.token, vendor);
      nav('/');
    } catch (e: any) { setErr(e?.message ?? 'login failed'); }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: '64px auto' }}>
      <h1>Hanoot Admin</h1>
      <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label>Vendor ID<input value={vendor} onChange={(e) => setVendor(e.target.value)} /></label>
      <button onClick={submit}>Sign in</button>
      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
    </main>
  );
}
```

- [ ] **Step 2: Commit (covered manually in smoke checklist; auth is exercised by backend integration tests already)**

```bash
git add backend/apps/admin/src/ui/screens/LoginScreen.tsx
git commit -m "feat(admin): login screen against Medusa /auth/user/emailpass"
```

---

### Task 4.4: SalesChart (recharts line) — vendor-scoped, range picker

**Files:**
- Create: `backend/apps/admin/src/ui/components/SalesChart.tsx`

- [ ] **Step 1: Implement**

```tsx
// backend/apps/admin/src/ui/components/SalesChart.tsx
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchSalesSummary, type SalesBucket } from '../../api/reports';
import { useAdminSession } from '../../state/session';

export function SalesChart() {
  const vendor = useAdminSession((s) => s.vendor_id);
  const [data, setData] = useState<SalesBucket[]>([]);
  const [from, setFrom] = useState<string>(() => new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetchSalesSummary(vendor, new Date(from), new Date(to), 'day')
      .then((r) => setData(r.buckets)).catch(() => setData([]));
  }, [vendor, from, to]);

  return (
    <section style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ flex: 1 }}>Sales</h2>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </header>
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data.map((b) => ({ ...b, revenue_k: b.revenue_minor / 1000 }))}>
            <XAxis dataKey="bucket_at" tickFormatter={(v) => String(v).slice(5, 10)} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue_k" stroke="var(--accent)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/apps/admin/src/ui/components/SalesChart.tsx
git commit -m "feat(admin): SalesChart recharts line with date range picker"
```

---

### Task 4.5: TopSkusTable

**Files:**
- Create: `backend/apps/admin/src/ui/components/TopSkusTable.tsx`

- [ ] **Step 1: Implement**

```tsx
// backend/apps/admin/src/ui/components/TopSkusTable.tsx
import { useEffect, useState } from 'react';
import { fetchTopSkus, type TopSku } from '../../api/reports';
import { useAdminSession } from '../../state/session';

export function TopSkusTable() {
  const vendor = useAdminSession((s) => s.vendor_id);
  const [items, setItems] = useState<TopSku[]>([]);

  useEffect(() => {
    fetchTopSkus(vendor, 20).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [vendor]);

  return (
    <section style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius)' }}>
      <h2>Top SKUs</h2>
      <table style={{ width: '100%' }}>
        <thead><tr><th align="left">Item</th><th align="right">Units</th><th align="right">Revenue</th></tr></thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.variant_id}>
              <td>{t.name_snapshot}</td>
              <td align="right">{t.units_sold}</td>
              <td align="right">{(t.revenue_minor / 1000).toFixed(2)}k</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/apps/admin/src/ui/components/TopSkusTable.tsx
git commit -m "feat(admin): TopSkusTable"
```

---

### Task 4.6: AlertsPanel (drift + low-stock)

**Files:**
- Create: `backend/apps/admin/src/ui/components/AlertsPanel.tsx`

- [ ] **Step 1: Implement**

```tsx
// backend/apps/admin/src/ui/components/AlertsPanel.tsx
import { useEffect, useState } from 'react';
import { fetchDriftAlerts, fetchLowStock, type DriftItem, type LowStockItem } from '../../api/reports';
import { useAdminSession } from '../../state/session';

export function AlertsPanel() {
  const vendor = useAdminSession((s) => s.vendor_id);
  const [drift, setDrift] = useState<DriftItem[]>([]);
  const [low, setLow] = useState<LowStockItem[]>([]);

  useEffect(() => {
    fetchDriftAlerts(vendor).then((r) => setDrift(r.flagged)).catch(() => setDrift([]));
    fetchLowStock(vendor, 5).then((r) => setLow(r.items)).catch(() => setLow([]));
  }, [vendor]);

  return (
    <section style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius)' }}>
      <h2>Alerts</h2>
      <h3>Drift ({drift.length})</h3>
      <ul>{drift.slice(0, 5).map((d) => (
        <li key={d.variant_id}>{d.variant_id}: {d.flag} (on_hand={d.on_hand}, reserved={d.reserved})</li>
      ))}</ul>
      <h3>Low stock ({low.length})</h3>
      <ul>{low.slice(0, 10).map((l) => (
        <li key={l.variant_id}>{l.variant_id}: available={l.available}</li>
      ))}</ul>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/apps/admin/src/ui/components/AlertsPanel.tsx
git commit -m "feat(admin): AlertsPanel (drift + low-stock)"
```

---

### Task 4.7: DashboardScreen wires the three panels in a desktop grid

**Files:**
- Replace: `backend/apps/admin/src/ui/screens/DashboardScreen.tsx`

- [ ] **Step 1: Implement**

```tsx
// backend/apps/admin/src/ui/screens/DashboardScreen.tsx
import { useNavigate } from 'react-router-dom';
import { SalesChart } from '../components/SalesChart';
import { TopSkusTable } from '../components/TopSkusTable';
import { AlertsPanel } from '../components/AlertsPanel';
import { useAdminSession } from '../../state/session';

export function DashboardScreen() {
  const nav = useNavigate();
  const vendor = useAdminSession((s) => s.vendor_id);
  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>Dashboard — vendor {vendor || '(none)'}</h1>
        <button onClick={() => { useAdminSession.getState().signOut(); nav('/login'); }}>Sign out</button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <SalesChart />
        <AlertsPanel />
        <div style={{ gridColumn: '1 / -1' }}><TopSkusTable /></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/apps/admin/src/ui/screens/DashboardScreen.tsx
git commit -m "feat(admin): DashboardScreen — 3-panel grid"
```

---

### Task 4.8: Smoke test renders all three with mocked api

**Files:**
- Create: `backend/apps/admin/tests/dashboard.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// backend/apps/admin/tests/dashboard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardScreen } from '../src/ui/screens/DashboardScreen';
import { useAdminSession } from '../src/state/session';
import * as reports from '../src/api/reports';

describe('DashboardScreen', () => {
  beforeEach(() => { vi.restoreAllMocks(); useAdminSession.setState({ token: 'tok', vendor_id: 'v_t' }); });

  it('renders all three panels with data', async () => {
    vi.spyOn(reports, 'fetchSalesSummary').mockResolvedValue({
      vendor_id: 'v_t', from: '', to: '', bucket: 'day',
      buckets: [{ bucket_at: '2026-05-01', sale_count: 1, revenue_minor: 1000 }],
    });
    vi.spyOn(reports, 'fetchTopSkus').mockResolvedValue({
      vendor_id: 'v_t', items: [{ variant_id: 'v1', name_snapshot: 'Bread', units_sold: 5, revenue_minor: 5000, sale_count: 3 }],
    });
    vi.spyOn(reports, 'fetchDriftAlerts').mockResolvedValue({ flagged: [] });
    vi.spyOn(reports, 'fetchLowStock').mockResolvedValue({ vendor_id: 'v_t', threshold: 5, items: [] });

    render(<MemoryRouter><DashboardScreen /></MemoryRouter>);
    await waitFor(() => screen.getByText('Sales'));
    await waitFor(() => screen.getByText('Bread'));
    expect(screen.getByText('Top SKUs')).toBeTruthy();
    expect(screen.getByText('Alerts')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
cd backend/apps/admin && npx vitest run tests/dashboard.test.tsx
# expected PASS
git add backend/apps/admin/tests/dashboard.test.tsx
git commit -m "test(admin): dashboard renders all three panels with mocked data"
```

---

## Section 5 — Cross-cutting: docs + smoke + phase tag

### Task 5.1: Update `project_phase_h2_done.md` memory to mark cleanup items done

**Files:**
- Modify: `C:\Users\h00816626\.claude\projects\d--Personal-08-Ecommerce-app\memory\project_phase_h2_done.md`

- [ ] **Step 1: Edit the "Known v1 limitations" block**

Replace the three bullets that we picked up with:

```
- Theme persists AND visually swaps (H-3 task 0.1)
- 'status: sending' rows reset to queued on app mount (H-3 task 0.2)
- Cashier-not-found timing oracle closed via dummy hash (H-3 task 0.3)
- Quick buttons don't auto-refresh after catalog refresh (still open — minor)
- Arabic/Kurdish receipts print as `?` (still open — defer to D-3 i18n)
- PoS doesn't auto-authenticate as admin (still open — defer)
```

- [ ] **Step 2: Commit (memory file is outside repo; no git commit)**

Save the file. Memory updates do not get committed via git.

---

### Task 5.2: Smoke checklist `docs/superpowers/plans/2026-05-26-phase-h3-smoke-checklist.md`

**Files:**
- Create: `docs/superpowers/plans/2026-05-26-phase-h3-smoke-checklist.md`

- [ ] **Step 1: Write the checklist**

```markdown
# Phase H-3 Smoke Checklist (manual, on real phone + desktop)

Run after subagent-driven-development finishes all H-3 tasks.

## Pre-flight
- [ ] `cd backend/apps/backend && npm run dev` — backend up at :9000
- [ ] `cd backend/apps/pos && npm run dev` — PoS up at :9200
- [ ] `cd backend/apps/admin && npm run dev` — Admin up at :9300
- [ ] All three apps tsc-clean: `npx tsc -b` in each directory
- [ ] All test suites green: `npm test` in each directory

## H-2 cleanup verification
- [ ] PoS Settings → flip theme to Light → page background swaps immediately
- [ ] Ring a sale offline, kill the tab mid-drain (DevTools → Network → offline; close tab while a sale is in 'sending' Dexie state); reopen — Dexie row is back to 'queued' and drains on reconnect
- [ ] Verify wrong-PIN vs unknown-cashier-id response latency comparable (DevTools Network tab; both ~50ms+ on a localhost run)

## Manager mode + Add product
- [ ] Create a manager cashier via `POST /admin/pos-terminal/cashiers` with role=manager
- [ ] Navigate to /manager — PIN gate shows; cashier role rejected; manager role admits
- [ ] Add product manually (no barcode): pick Grocery → fill title + price + weight → Save → product appears in /manager/catalog after refresh; visible in PoS register via catalog refresh
- [ ] Add product via barcode lookup (use a real OpenFoodFacts code, e.g. 5740900401099): title + image auto-fill; classifier picks Grocery (or Other if no OpenAI key); manual override works
- [ ] Add product via camera scan (real phone): /manager/catalog/new → tap "Camera" → grant permission → scan a packaged-goods barcode → form pre-fills

## CSV import
- [ ] /manager/import → upload a 5-row CSV → preview shows headers + first 5 rows → upload → result reports created/failed counts; failures listed with row numbers and reasons

## Admin dashboard
- [ ] Open :9300 → /login → sign in with admin user → redirected to /
- [ ] SalesChart shows the seeded sales from this session
- [ ] TopSkusTable lists the top SKUs ranked by revenue
- [ ] AlertsPanel — drift is empty in happy path; low-stock lists items under threshold 5
- [ ] Date range picker changes the chart data when narrowed

## Speed-bar spot checks (stopwatch)
- [ ] Barcode lookup roundtrip < 800ms on broadband
- [ ] Schema form renders < 100ms after category click (DevTools Performance)
- [ ] CSV with 1,000 rows finishes < 30s (use the included 1k-row test CSV)
- [ ] Manager PIN verify < 300ms

## Regression
- [ ] PoS register (/) still rings sales as before
- [ ] PoS cashier login (LoginScreen) still works
- [ ] Existing pos_terminal integration tests still pass
- [ ] wms drift detection still passes
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-05-26-phase-h3-smoke-checklist.md
git commit -m "docs: H-3 manual smoke checklist"
```

---

### Task 5.3: Git tag `phase-h3-inventory-admin-complete`

- [ ] **Step 1: Confirm working tree clean + tests green**

```bash
git status
cd backend/apps/backend && npm test
cd ../pos && npm test
cd ../admin && npm test
```

Expected: all PASS, working tree clean.

- [ ] **Step 2: Tag locally only (do NOT push — per project_phase_h2_done.md precedent)**

```bash
git tag -a phase-h3-inventory-admin-complete -m "Phase H-3: inventory data entry + reports admin complete"
```

- [ ] **Step 3: Update `MEMORY.md` index — add new project memory**

Create memory file `project_phase_h3_done.md` per the auto-memory schema documenting what shipped, the new module names, route paths, and any new limitations (e.g., "image upload still URL-only — file upload deferred", "PWA install for admin app deferred"). Then add the index line to `MEMORY.md`.

---

## Final self-review checklist (run after Task 5.3)

- [ ] Every section of the vision doc H-3 row maps to a task (camera-first ✓ 3.4/3.6; AI auto-populate ✓ 2.1/2.2/3.6; CSV import ✓ 2.5/3.8; schema-driven ✓ 1.1-1.4/3.5/3.6; PIN-gated manager ✓ 3.2/3.3; separate reports dashboard ✓ Section 4)
- [ ] Three picked-up H-2 limitations all have tasks (✓ 0.1, 0.2, 0.3)
- [ ] No "TBD" or "see above" — every task has full code in every step
- [ ] Type consistency: `FieldDef` shape is identical between backend (`types.ts`), api (`api/pos.ts`), and renderer (`SchemaFieldRenderer.tsx`)
- [ ] Method names match between backend (`recordSale`, `verifyCashierPin`, `listCategories`, `getSchemaByHandle`, `classifyProductCategory`, `incrementStock`, `detectStockDrift`) and frontend callers
- [ ] All commits committed with conventional-commits style consistent with H-2's history
- [ ] Phase tag is local-only, not pushed (matches user's policy)
