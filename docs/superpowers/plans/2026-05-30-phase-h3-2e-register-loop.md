# Phase H-3.2e — "Close the Register Loop" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make products a manager adds sellable at the cashier register (correct price), and silence the `/pos/alerts` console flood.

**Architecture:** Three slices. **Task B** (backend, no UI): add a real `GET /pos/alerts` route + `/pos/*` CORS. **Task A1** (backend bug-fix, no UI): fix `catalog-snapshot` so it returns real prices + category data (mirror the proven `manager-products` raw-SQL reads). **Task A2** (frontend, DESIGN-GATED — mockup approved): the register's right pane renders from the real offline catalog (Dexie) instead of the hardcoded `QUICK_TILES`, with search + department filter + empty/loading states. **Task A3** (optional fast-follow): Favorites pinning.

**Tech Stack:** Medusa v2 (Express file-routes, raw `pg` SQL, `wmsService`), React + Zustand + Dexie (PWA at :9200), Jest (backend HTTP/integration), Vitest + @testing-library/react + fake-indexeddb (pos).

**Key conventions (carry-forward):**
- bootstrapAdmin helper: `backend/apps/backend/integration-tests/helpers/admin.ts` (`bootstrapAdmin`, `adminHeaders`).
- HTTP + module suites run **ONE AT A TIME**: `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit "<one file>"` (run from `backend/apps/backend`).
- Pos vitest: `npx vitest run <file>` from `backend/apps/pos`. Use `vi.fn`/`vi.mock`; **no `user-event`** — use `fireEvent`.
- `req.audit_context = { vendor_id }` before any mutation (already set in existing mutating routes; the new routes here are read-only GETs, so N/A).
- Test vendor: `v_test`. Cashier: QA Manager / PIN 4242.
- After deleting `.js` shadow files in `pos/src`, restart the Vite dev server.

**Out of scope (deferred):** Task C (Add-Product photo upload) — separate design-gated mini-phase. Do NOT build it here.

---

## File Structure

**Task B**
- Create: `backend/apps/backend/src/api/pos/alerts/route.ts` — `GET /pos/alerts` → maps `wmsService.detectStockDrift` to the POS `AlertRow[]` shape.
- Modify: `backend/apps/backend/src/api/middlewares.ts` — add a `/pos/*` CORS block (mirror `/vendor/*`).
- Create: `backend/apps/backend/integration-tests/http/pos-alerts.spec.ts` — route smoke + CORS header.

**Task A1**
- Modify: `backend/apps/backend/src/api/admin/pos-terminal/catalog-snapshot/route.ts` — list-all + JS filter, raw-SQL price join, raw-SQL category names, add `merch_category_id` + `category_name` + `thumb_emoji` to each item.
- Modify: `backend/apps/pos/src/api/pos.ts` — extend `CatalogSnapshot.items` type.
- Modify: `backend/apps/pos/src/db/dexie.ts` — extend `CatalogRow` type (no schema/version bump — extra fields are stored without an index).
- Modify: `backend/apps/pos/src/db/catalog-sync.ts` — carry new fields through `syncCatalog`'s map.
- Create: `backend/apps/backend/integration-tests/http/catalog-snapshot.spec.ts` — price regression test.

**Task A2**
- Modify: `backend/apps/pos/src/db/catalog-sync.ts` — add `loadCatalogFromDb()`.
- Modify: `backend/apps/pos/tests/catalog-sync.test.ts` — test `loadCatalogFromDb`.
- Create: `backend/apps/pos/src/ui/screens/register/CatalogBrowser.tsx` + `.css` — the new right-pane (search, dept chips, grid, states). Extracted so `RegisterScreen.tsx` stays focused.
- Modify: `backend/apps/pos/src/ui/screens/RegisterScreen.tsx` — replace the `QUICK_TILES` `<aside>` with `<CatalogBrowser onPick={…} />`; delete `QUICK_TILES` + `handleTileClick`; keep everything else (header, cart, charge, scan, alerts poll).
- Modify: `backend/apps/pos/tests/screens/RegisterScreen.test.tsx` — existing tests assert on the `QUICK_TILES` text `'Milk 1L · Almarai'`; rewrite them to mock `catalog-sync` and assert `CatalogBrowser` renders (see Task A2.3 Step 5).
- Create: `backend/apps/pos/tests/screens/CatalogBrowser.test.tsx` — render-from-catalog, search, dept filter, empty state, click→cart.

> **Test infra note:** `backend/apps/pos/tests/setup.ts` is the global vitest setup — it already imports `fake-indexeddb/auto`, `@testing-library/jest-dom`, and shims `window.matchMedia` to `{ matches: false }` (= tablet/desktop, so the register's right pane renders). Component tests do NOT need their own matchMedia shim.

**Task A3 (optional)**
- Modify: `CatalogBrowser.tsx` + `catalog-sync.ts` (favorites in Dexie `config`).

---

## TASK B — Real `/pos/alerts` + `/pos/*` CORS  (ship first; no UI gate)

**Why:** `RegisterScreen.tsx:53-66` polls `fetchAlerts(vendor_id)` every 30 s → `GET /pos/alerts` 404s, and the 404 carries no `Access-Control-Allow-Origin` (custom CORS only covers `/vendor/*`; Medusa built-in only `/store /admin /auth`). It fail-softs to `[]` but the browser logs a 404 + CORS error every 30 s. Build the real route + CORS so alerts are live and the console is clean.

### Task B.1 — `/pos/*` CORS middleware

**Files:** Modify `backend/apps/backend/src/api/middlewares.ts`

- [ ] **Step 1: Add the POS_CORS env const** next to `VENDOR_CORS` (after line 18):

```ts
const POS_CORS = (process.env.POS_CORS ?? "http://localhost:9200")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
```

- [ ] **Step 2: Add a `/pos/*` cors block** as the SECOND entry of the `routes` array (immediately after the `/vendor/*` cors block that ends at line 37, before the `import-csv` block):

```ts
    {
      matcher: "/pos/*",
      middlewares: [
        cors({
          origin: POS_CORS,
          credentials: true,
          allowedHeaders: [
            "Content-Type",
            "Authorization",
            "x-publishable-api-key",
          ],
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        }),
      ],
    },
```

- [ ] **Step 3: Commit** (CORS alone is mechanical; the route + test follow):

```bash
git add backend/apps/backend/src/api/middlewares.ts
git commit -m "feat(cors): allow /pos/* cross-origin from the POS PWA (:9200)"
```

### Task B.2 — `GET /pos/alerts` route (TDD)

**Files:**
- Create: `backend/apps/backend/src/api/pos/alerts/route.ts`
- Create test: `backend/apps/backend/integration-tests/http/pos-alerts.spec.ts`

- [ ] **Step 1: Write the failing HTTP test**

```ts
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { bootstrapAdmin, adminHeaders } from "../helpers/admin"

jest.setTimeout(120000)

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    describe("GET /pos/alerts", () => {
      beforeAll(async () => {
        await bootstrapAdmin()
      })

      it("returns 200 with an alerts array", async () => {
        const res = await api.get("/pos/alerts?vendor_id=v_test", {
          headers: { ...adminHeaders().headers, Origin: "http://localhost:9200" },
        })
        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.alerts)).toBe(true)
      })

      it("sends an Access-Control-Allow-Origin header for the POS origin", async () => {
        const res = await api.get("/pos/alerts?vendor_id=v_test", {
          headers: { ...adminHeaders().headers, Origin: "http://localhost:9200" },
        })
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:9200")
      })
    })
  },
})
```

- [ ] **Step 2: Run it — expect FAIL** (404, route missing):

```
cd backend/apps/backend
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit integration-tests/http/pos-alerts.spec.ts
```
Expected: FAIL — status 404 (route not found).

- [ ] **Step 3: Implement the route** at `backend/apps/backend/src/api/pos/alerts/route.ts`.

> **REAL SHAPE (verified):** `wmsService.detectStockDrift({ vendor_id })` returns `{ flagged: DriftRow[] }` where `DriftRow = { vendor_id, variant_id, on_hand, reserved, flag: "negative_on_hand" | "reserved_exceeds_on_hand" }` (see `backend/apps/backend/src/modules/wms/types.ts` + `service.ts:627`). There is **no** `drift` / `severity` / `expected` / `delta` / `detected_at`. Map from `flagged`:

```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /pos/alerts?vendor_id=<id>
// Surfaces wms stock-drift findings to the cashier register as alert rows.
// Maps wmsService.detectStockDrift().flagged → the POS AlertRow shape (apps/pos/src/api/alerts.ts).
type AlertRow = {
  id: string
  severity: "critical" | "warning" | "info"
  title: string
  message: string
  type: string
  created_at: string
  read_at: string | null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: "vendor_id required" })

  const now = new Date().toISOString()
  let alerts: AlertRow[] = []
  try {
    const wms: any = req.scope.resolve("wmsService")
    const report = await wms.detectStockDrift({ vendor_id })
    alerts = (report?.flagged ?? []).map((d: any) => {
      const negative = d.flag === "negative_on_hand"
      return {
        id: `drift_${d.variant_id}_${d.flag}`,
        severity: negative ? ("critical" as const) : ("warning" as const),
        title: negative ? "Negative on-hand" : "Reserved exceeds on-hand",
        message: negative
          ? `${d.variant_id}: on-hand is ${d.on_hand}`
          : `${d.variant_id}: reserved ${d.reserved} exceeds on-hand ${d.on_hand}`,
        type: "stock_drift",
        created_at: now,
        read_at: null,
      }
    })
  } catch {
    // wms unavailable / no stock records yet — degrade to an empty list (route still 200s).
    alerts = []
  }

  res.json({ vendor_id, alerts })
}
```

- [ ] **Step 4: Run the test — expect PASS** (same command as Step 2). Expected: both `it`s PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/backend/src/api/pos/alerts/route.ts backend/apps/backend/integration-tests/http/pos-alerts.spec.ts
git commit -m "feat(pos): GET /pos/alerts proxies wms stock-drift to register alert rows"
```

- [ ] **Step 6: Live-verify the flood is gone** (deferred to the Task-B verification gate below — see "Live verification").

---

## TASK A1 — Fix `catalog-snapshot` (price + category)  (backend bug-fix; no UI gate)

**Why:** `catalog-snapshot/route.ts:31` reads `v.prices?.[0]?.amount` → always `0` in Medusa v2 (prices live in `product_variant_price_set`). It also uses the fragile `metadata` filter and carries no category data. Port the proven reads from `manager-products/route.ts` so the register shows real prices and can filter by department offline.

**Files:**
- Modify: `backend/apps/backend/src/api/admin/pos-terminal/catalog-snapshot/route.ts`
- Modify: `backend/apps/pos/src/api/pos.ts`, `backend/apps/pos/src/db/dexie.ts`, `backend/apps/pos/src/db/catalog-sync.ts`
- Create test: `backend/apps/backend/integration-tests/http/catalog-snapshot.spec.ts`

### Task A1.1 — Price regression test (TDD, write first)

- [ ] **Step 1: Write the failing HTTP test** at `integration-tests/http/catalog-snapshot.spec.ts`:

```ts
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { bootstrapAdmin, adminHeaders } from "../helpers/admin"

jest.setTimeout(120000)

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    const vendorId = "v_test"

    describe("GET /admin/pos-terminal/catalog-snapshot", () => {
      beforeAll(async () => {
        await bootstrapAdmin()
      })

      it("returns the real price_minor (not 0) for a created product", async () => {
        const createRes = await api.post(
          "/admin/catalog/manager-products",
          { vendor_id: vendorId, title: "Snapshot Price Probe", price_minor: 4250, currency_code: "iqd" },
          adminHeaders(),
        )
        expect(createRes.status).toBe(201)

        const res = await api.get(
          `/admin/pos-terminal/catalog-snapshot?vendor_id=${vendorId}`,
          adminHeaders(),
        )
        expect(res.status).toBe(200)
        const item = res.data.items.find((i: any) => i.name.startsWith("Snapshot Price Probe"))
        expect(item).toBeTruthy()
        expect(item.price_minor).toBe(4250)
        // new fields present (may be null when no department assigned):
        expect(item).toHaveProperty("merch_category_id")
        expect(item).toHaveProperty("category_name")
        expect(item).toHaveProperty("thumb_emoji")
      })
    })
  },
})
```

- [ ] **Step 2: Run it — expect FAIL** (`price_minor` is `0`):

```
cd backend/apps/backend
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit integration-tests/http/catalog-snapshot.spec.ts
```
Expected: FAIL — `expected 4250, received 0`.

### Task A1.2 — Rewrite the route

- [ ] **Step 3: Replace the whole body** of `catalog-snapshot/route.ts` with the manager-products-style implementation:

```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Returns the full vendor catalog in a shape the PoS Dexie cache ingests directly.
// Mirrors admin/catalog/manager-products: list-all + JS metadata filter, raw-SQL
// price join (prices live in product_variant_price_set, not on the variant), and
// raw-SQL department-name lookup so the register can filter by department offline.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: "vendor_id required" })

  const product: any = req.scope.resolve("product")
  const wms: any = req.scope.resolve("wmsService")
  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // List all, then filter by metadata.created_by_vendor_id in JS (version-robust).
  let allRows: any[] = []
  for (const relations of [["variants"], []]) {
    const result = await product.listProducts({}, { relations, take: 5000 }).catch(() => null)
    if (result !== null) { allRows = result; break }
  }
  const rows = allRows.filter(
    (p: any) => (p.metadata as any)?.created_by_vendor_id === vendor_id,
  )

  // Bulk price fetch via product_variant_price_set → price (raw SQL, no N+1).
  const variantIds = rows.flatMap((p: any) => (p.variants ?? []).map((v: any) => v.id)).filter(Boolean)
  const priceByVariant: Record<string, { amount: number; currency_code: string }> = {}
  if (variantIds.length > 0 && pg) {
    try {
      const placeholders = variantIds.map(() => "?").join(", ")
      const r = await pg.raw(
        `SELECT pvps.variant_id, p.amount, p.currency_code
           FROM product_variant_price_set pvps
           JOIN price p ON p.price_set_id = pvps.price_set_id
          WHERE pvps.variant_id IN (${placeholders})
            AND pvps.deleted_at IS NULL AND p.deleted_at IS NULL
          ORDER BY pvps.variant_id, p.created_at ASC`,
        variantIds,
      )
      for (const row of (r?.rows ?? r ?? [])) {
        if (!priceByVariant[row.variant_id]) {
          priceByVariant[row.variant_id] = { amount: Number(row.amount), currency_code: row.currency_code }
        }
      }
    } catch { /* pricing tables unavailable (test env) — fall through to 0 */ }
  }

  // Department names: merch_category (id, name) for this vendor.
  const categoryNameById: Record<string, string> = {}
  if (pg) {
    try {
      const r = await pg.raw(
        `SELECT id, name FROM merch_category WHERE vendor_id = ? AND deleted_at IS NULL`,
        [vendor_id],
      )
      for (const row of (r?.rows ?? r ?? [])) categoryNameById[row.id] = row.name
    } catch { /* table absent in test env — names stay null */ }
  }

  const items: any[] = []
  for (const p of rows) {
    const merch_category_id = (p.metadata?.merch_category_id as string) ?? null
    for (const v of (p.variants ?? [])) {
      const price = priceByVariant[v.id] ?? null
      let on_hand = 0
      try { on_hand = (await wms.getStock(vendor_id, v.id)).on_hand } catch { /* 0 */ }
      items.push({
        variant_id: v.id,
        product_id: p.id,
        sku: v.sku ?? null,
        barcode: v.barcode ?? null,
        name: `${p.title}${v.title && v.title !== p.title ? " – " + v.title : ""}`,
        price_minor: price?.amount ?? Number(v.prices?.[0]?.amount ?? 0),
        currency_code: price?.currency_code ?? v.prices?.[0]?.currency_code ?? "iqd",
        image_url: p.thumbnail ?? null,
        thumb_emoji: (p.metadata?.thumb_emoji as string) ?? null,
        merch_category_id,
        category_name: merch_category_id ? (categoryNameById[merch_category_id] ?? null) : null,
        on_hand,
      })
    }
  }

  res.json({ vendor_id, items, generated_at: new Date().toISOString() })
}
```

- [ ] **Step 4: Run the test — expect PASS** (same command as A1.1 Step 2). Expected: `price_minor === 4250`, new props present.

### Task A1.3 — Carry the new fields through the POS types

- [ ] **Step 5: Extend `CatalogSnapshot.items`** in `backend/apps/pos/src/api/pos.ts` (the `items` array element type) — add three fields after `image_url`:

```ts
    image_url: string | null; thumb_emoji: string | null;
    merch_category_id: string | null; category_name: string | null;
    on_hand: number;
```

- [ ] **Step 6: Extend `CatalogRow`** in `backend/apps/pos/src/db/dexie.ts` (after `image_url`):

```ts
  image_url: string | null; thumb_emoji: string | null;
  merch_category_id: string | null; category_name: string | null;
  on_hand: number; updated_at: string;
```
(No `this.version(...)` bump — Dexie stores these un-indexed fields as-is.)

- [ ] **Step 7: Confirm `syncCatalog` carries them** — `catalog-sync.ts` maps with `{ ...it, updated_at: snap.generated_at }`, so the new fields flow automatically. No change needed; verify by reading the spread.

- [ ] **Step 8: Run pos type-check + the existing sync test:**

```
cd backend/apps/pos
npx tsc --noEmit
npx vitest run tests/catalog-sync.test.ts
```
Expected: tsc clean; catalog-sync test still PASS. (The existing test's mock item is missing the new fields — TS may flag the mock. If so, add `thumb_emoji: null, merch_category_id: null, category_name: null` to the mock item in `catalog-sync.test.ts`.)

- [ ] **Step 9: Commit**

```bash
git add backend/apps/backend/src/api/admin/pos-terminal/catalog-snapshot/route.ts backend/apps/backend/integration-tests/http/catalog-snapshot.spec.ts backend/apps/pos/src/api/pos.ts backend/apps/pos/src/db/dexie.ts backend/apps/pos/tests/catalog-sync.test.ts
git commit -m "fix(catalog-snapshot): real price_minor via price_set join + add department/emoji fields"
```

---

## TASK A2 — Register grid → real catalog  (frontend; DESIGN-GATED — mockup approved)

**Design contract:** `docs/mockups/h3-2e/register-catalog.html` (approved). Right pane = tabs (All items / Favorites / Orders) · sticky search · department chips (built from categories present) · 3-col tile grid (emoji/image, name, **real price**, stock; OOS dimmed) · empty / no-match / syncing states. Left cart/scan/charge unchanged. Payment math untouched.

### Task A2.1 — `loadCatalogFromDb()` (TDD)

**Files:** Modify `backend/apps/pos/src/db/catalog-sync.ts`, `backend/apps/pos/tests/catalog-sync.test.ts`

- [ ] **Step 1: Add the failing test** to `catalog-sync.test.ts` (new `it` inside the existing describe):

```ts
  it('loadCatalogFromDb returns all cached rows', async () => {
    vi.spyOn(posApi, 'fetchCatalogSnapshot').mockResolvedValue({
      vendor_id: 'v_test', generated_at: new Date().toISOString(),
      items: [
        { variant_id: 'v1', product_id: 'p1', sku: 'S1', barcode: '1', name: 'Bread',
          price_minor: 2500, currency_code: 'iqd', image_url: null, thumb_emoji: '🍞',
          merch_category_id: 'mc1', category_name: 'Bakery', on_hand: 5 },
        { variant_id: 'v2', product_id: 'p2', sku: 'S2', barcode: '2', name: 'Milk',
          price_minor: 2750, currency_code: 'iqd', image_url: null, thumb_emoji: '🥛',
          merch_category_id: 'mc2', category_name: 'Dairy', on_hand: 9 },
      ],
    });
    await syncCatalog('v_test');
    const rows = await loadCatalogFromDb();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.name).sort()).toEqual(['Bread', 'Milk']);
  });
```
(Also add `loadCatalogFromDb` to the import on line 4 and the new fields to the FIRST test's mock item.)

- [ ] **Step 2: Run — expect FAIL** (`loadCatalogFromDb is not a function`):

```
cd backend/apps/pos
npx vitest run tests/catalog-sync.test.ts
```

- [ ] **Step 3: Implement** in `catalog-sync.ts` (append):

```ts
export async function loadCatalogFromDb(): Promise<CatalogRow[]> {
  return db.catalog.toArray();
}
```

- [ ] **Step 4: Run — expect PASS** (same command).

- [ ] **Step 5: Commit**

```bash
git add backend/apps/pos/src/db/catalog-sync.ts backend/apps/pos/tests/catalog-sync.test.ts
git commit -m "feat(pos): loadCatalogFromDb() reader for the register grid"
```

### Task A2.2 — `CatalogBrowser` component (TDD)

**Files:** Create `backend/apps/pos/src/ui/screens/register/CatalogBrowser.tsx` (+ `.css`), `backend/apps/pos/tests/catalog-browser.test.tsx`

- [ ] **Step 1: Write the failing component test** at `backend/apps/pos/tests/screens/CatalogBrowser.test.tsx`. (matchMedia + fake-indexeddb are shimmed globally in `tests/setup.ts` — no per-test shim needed.) The offline-first effect calls `loadCatalogFromDb` twice (cached, then post-sync), so use persistent `mockResolvedValue` (not `…Once`):

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CatalogBrowser } from '../../src/ui/screens/register/CatalogBrowser';
import type { CatalogRow } from '../../src/db/dexie';
import * as catalogSync from '../../src/db/catalog-sync';

const ROWS: CatalogRow[] = [
  { variant_id: 'v1', product_id: 'p1', sku: 'S1', barcode: '1', name: 'Sourdough Loaf',
    price_minor: 2500, currency_code: 'iqd', image_url: null, thumb_emoji: '🍞',
    merch_category_id: 'mc1', category_name: 'Bakery', on_hand: 18, updated_at: 'x' },
  { variant_id: 'v2', product_id: 'p2', sku: 'S2', barcode: '2', name: 'Milk 1L',
    price_minor: 2750, currency_code: 'iqd', image_url: null, thumb_emoji: '🥛',
    merch_category_id: 'mc2', category_name: 'Dairy', on_hand: 42, updated_at: 'x' },
];

vi.mock('../../src/db/catalog-sync', () => ({
  syncCatalog: vi.fn(),
  loadCatalogFromDb: vi.fn(),
}));

beforeEach(() => {
  (catalogSync.syncCatalog as any).mockResolvedValue(2);
  (catalogSync.loadCatalogFromDb as any).mockResolvedValue(ROWS);
});

describe('CatalogBrowser', () => {
  it('renders product tiles from the real catalog with correct price', async () => {
    render(<CatalogBrowser vendorId="v_test" onPick={vi.fn()} />);
    expect(await screen.findByText('Sourdough Loaf')).toBeTruthy();
    expect(screen.getByText('2,500 IQD')).toBeTruthy();
    expect(screen.getByText('Milk 1L')).toBeTruthy();
  });

  it('filters by search query', async () => {
    render(<CatalogBrowser vendorId="v_test" onPick={vi.fn()} />);
    await screen.findByText('Sourdough Loaf');
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'milk' } });
    expect(screen.queryByText('Sourdough Loaf')).toBeNull();
    expect(screen.getByText('Milk 1L')).toBeTruthy();
  });

  it('filters by department chip', async () => {
    render(<CatalogBrowser vendorId="v_test" onPick={vi.fn()} />);
    await screen.findByText('Sourdough Loaf');
    fireEvent.click(screen.getByRole('button', { name: 'Bakery' }));
    expect(screen.getByText('Sourdough Loaf')).toBeTruthy();
    expect(screen.queryByText('Milk 1L')).toBeNull();
  });

  it('calls onPick with the catalog row when a tile is tapped', async () => {
    const onPick = vi.fn();
    render(<CatalogBrowser vendorId="v_test" onPick={onPick} />);
    fireEvent.click(await screen.findByText('Sourdough Loaf'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ variant_id: 'v1', price_minor: 2500 }));
  });

  it('shows an empty state when the catalog is empty', async () => {
    (catalogSync.loadCatalogFromDb as any).mockResolvedValue([]);
    render(<CatalogBrowser vendorId="v_test" onPick={vi.fn()} />);
    expect(await screen.findByText(/No products yet/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (component missing):

```
cd backend/apps/pos
npx vitest run tests/screens/CatalogBrowser.test.tsx
```

- [ ] **Step 3: Implement `CatalogBrowser.tsx`:**

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { CatalogRow } from '../../../db/dexie';
import { syncCatalog, loadCatalogFromDb } from '../../../db/catalog-sync';
import './CatalogBrowser.css';

function formatIQD(minor: number): string {
  return `${minor.toLocaleString('en-US')} IQD`;
}

export function CatalogBrowser({
  vendorId,
  onPick,
}: {
  vendorId: string;
  onPick: (row: CatalogRow) => void;
}) {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState<string>('All');

  useEffect(() => {
    let alive = true;
    (async () => {
      // Offline-first: show cached instantly, then refresh in the background.
      const cached = await loadCatalogFromDb();
      if (alive && cached.length) { setRows(cached); setLoading(false); }
      try { await syncCatalog(vendorId); } catch { /* offline — keep cache */ }
      const fresh = await loadCatalogFromDb();
      if (alive) { setRows(fresh); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [vendorId]);

  const departments = useMemo(() => {
    const names = new Set<string>();
    for (const r of rows) if (r.category_name) names.add(r.category_name);
    return ['All', ...[...names].sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (dept !== 'All' && r.category_name !== dept) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.sku ?? '').toLowerCase().includes(q) ||
        (r.barcode ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, dept]);

  return (
    <aside className="catalog-browser">
      <div className="cb-search">
        <input
          type="text"
          placeholder="Search products or scan…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
        />
        {query && <button type="button" className="cb-clear" aria-label="Clear search" onClick={() => setQuery('')}>✕</button>}
      </div>

      <div className="cb-dept-rail">
        {departments.map((d) => (
          <button
            key={d}
            type="button"
            className={`cb-chip${dept === d ? ' active' : ''}`}
            onClick={() => setDept(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cb-grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="cb-skel" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="cb-state">
          <div className="cb-state-emoji" aria-hidden="true">🗂️</div>
          <div className="cb-state-title">No products yet</div>
          <div className="cb-state-desc">Items added in Manager → Catalog appear here. You can still scan a barcode to ring up.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="cb-state">
          <div className="cb-state-emoji" aria-hidden="true">🔍</div>
          <div className="cb-state-title">No matches</div>
          <div className="cb-state-desc">Nothing matches “{query}”{dept !== 'All' ? ` in ${dept}` : ''}.</div>
        </div>
      ) : (
        <>
          <div className="cb-meta">{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</div>
          <div className="cb-grid">
            {filtered.map((r) => {
              const oos = r.on_hand <= 0;
              return (
                <button
                  key={r.variant_id}
                  type="button"
                  className={`cb-tile${oos ? ' oos' : ''}`}
                  onClick={() => onPick(r)}
                  disabled={oos}
                >
                  <div className="cb-tile-icon" aria-hidden="true">
                    {r.image_url ? <img src={r.image_url} alt="" /> : (r.thumb_emoji ?? '📦')}
                  </div>
                  <div className="cb-tile-name">{r.name}</div>
                  <div className="cb-tile-price">{formatIQD(r.price_minor)}</div>
                  <div className="cb-tile-stock">{oos ? 'Out of stock' : `${r.on_hand} in stock`}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Create `CatalogBrowser.css`** — reuse the register's existing tokens (`tokens.css` is global). Concrete styles (match the mockup; the `.actions-side` look it replaces uses paper/ink/gold tokens):

```css
.catalog-browser { background: var(--paper-2); border-left: 1px solid var(--line-3);
  display: flex; flex-direction: column; min-height: 0; }
.cb-search { padding: 12px 14px 8px; }
.cb-search input { width: 100%; background: var(--paper); border: 1px solid var(--line-3);
  border-radius: var(--radius-lg); padding: 10px 12px; font: inherit; font-size: 14px; color: var(--ink); }
.cb-search input:focus { outline: none; border-color: var(--gold-2); }
.cb-clear { margin-top: -34px; float: right; margin-right: 8px; background: transparent;
  border: 0; color: var(--ink-3); cursor: pointer; font-size: 14px; }
.cb-dept-rail { display: flex; gap: 8px; padding: 6px 14px 10px; overflow-x: auto; }
.cb-chip { flex-shrink: 0; padding: 7px 14px; border-radius: var(--radius-pill);
  background: var(--paper); border: 1px solid var(--line-3); font-size: 12px; font-weight: 700;
  color: var(--ink-3); cursor: pointer; white-space: nowrap; }
.cb-chip.active { background: var(--ink); color: var(--paper-2); border-color: var(--ink); }
.cb-meta { padding: 0 16px 6px; font-size: 11px; color: var(--ink-3); font-weight: 600; }
.cb-grid { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 14px 16px;
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; align-content: start; }
.cb-tile { position: relative; background: linear-gradient(180deg, var(--paper-2), var(--paper));
  border: 1px solid var(--line-3); border-radius: var(--radius-xl); padding: 12px 8px 10px;
  display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer;
  min-height: 110px; justify-content: center; text-align: center;
  box-shadow: var(--shadow-sm); transition: transform 150ms, border-color 150ms; }
.cb-tile:hover:not(:disabled) { transform: translateY(-1px); border-color: var(--gold-2); }
.cb-tile:disabled { opacity: .5; cursor: not-allowed; }
.cb-tile-icon { font-size: 28px; line-height: 1; }
.cb-tile-icon img { width: 36px; height: 36px; object-fit: cover; border-radius: var(--radius-md); }
.cb-tile-name { font-size: 12px; font-weight: 700; color: var(--ink); line-height: 1.25; }
.cb-tile-price { font-size: 13px; font-weight: 800; color: var(--gold-3);
  font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: 'tnum'; }
.cb-tile-stock { font-size: 10px; color: var(--ink-3); font-weight: 600; }
.cb-tile.oos .cb-tile-stock { color: var(--burgundy); }
.cb-state { flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; padding: 30px; text-align: center; color: var(--ink-3); }
.cb-state-emoji { font-size: 40px; opacity: .7; }
.cb-state-title { color: var(--ink); font-weight: 800; font-size: 15px; }
.cb-state-desc { font-size: 12px; line-height: 1.5; max-width: 230px; }
.cb-skel { min-height: 110px; border-radius: var(--radius-xl); border: 1px solid var(--line-3);
  background: linear-gradient(180deg, var(--paper-2), var(--paper)); animation: cb-pulse 1.4s ease-in-out infinite; }
@keyframes cb-pulse { 0%,100% { opacity: .45 } 50% { opacity: .8 } }
@media (prefers-reduced-motion: reduce) { .cb-tile, .cb-skel { transition: none; animation: none; } }
```

- [ ] **Step 5: Run — expect PASS** (all 5 `it`s). Same command as Step 2.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/pos/src/ui/screens/register/CatalogBrowser.tsx backend/apps/pos/src/ui/screens/register/CatalogBrowser.css backend/apps/pos/tests/screens/CatalogBrowser.test.tsx
git commit -m "feat(pos): CatalogBrowser — register grid from the real offline catalog"
```

### Task A2.3 — Wire `CatalogBrowser` into `RegisterScreen`

**Files:** Modify `backend/apps/pos/src/ui/screens/RegisterScreen.tsx`

- [ ] **Step 1: Add the import** (after the `findByBarcode` import, line 8):

```tsx
import { CatalogBrowser } from './register/CatalogBrowser';
import type { CatalogRow } from '../../db/dexie';
```

- [ ] **Step 2: Delete** the `QUICK_TILES` array (lines 16-25) and the `DEPARTMENTS` const (line 14) — both are now obsolete (departments come from the catalog inside `CatalogBrowser`).

- [ ] **Step 3: Replace `handleTileClick`** (lines 75-83) with a catalog-row picker:

```tsx
  const handlePick = useCallback((row: CatalogRow) => {
    useCart.getState().addLineFromScan({
      variant_id: row.variant_id,
      name: row.name,
      unit_price_minor: row.price_minor,
      qty: 1,
    });
    try { new Audio('/beep.wav').play().catch(() => {}); } catch { /* noop */ }
  }, []);
```

- [ ] **Step 4: Remove** the now-unused `activeTab`/`activeDept` state (lines 47-48) and replace the entire right-pane `<aside className="actions-side">…</aside>` block (lines 240-289) with:

```tsx
        {!isPhone && <CatalogBrowser vendorId={vendor_id} onPick={handlePick} />}
```
(Keep the surrounding `{!isPhone && (…)}` semantics — `CatalogBrowser` itself is tablet-only here. The old `actions-tabs`/`dept-rail-mini`/`tile-grid` markup is fully removed.)

- [ ] **Step 5: Update the existing `tests/screens/RegisterScreen.test.tsx`.** Its first two `it`s assert on the deleted `QUICK_TILES` text (`'Milk 1L · Almarai'`) and will now fail. Replace the whole `describe('RegisterScreen', …)` block (and add the `catalog-sync` mock at top, after the imports) so it asserts the register renders with `CatalogBrowser` wired:

```tsx
// add near the top, after the existing imports:
import * as catalogSync from '../../src/db/catalog-sync';
vi.mock('../../src/db/catalog-sync', async (orig) => ({
  ...(await orig<typeof import('../../src/db/catalog-sync')>()),
  syncCatalog: vi.fn().mockResolvedValue(0),
  loadCatalogFromDb: vi.fn().mockResolvedValue([
    { variant_id: 'v1', product_id: 'p1', sku: 'S1', barcode: '1', name: 'Sourdough Loaf',
      price_minor: 2500, currency_code: 'iqd', image_url: null, thumb_emoji: '🍞',
      merch_category_id: 'mc1', category_name: 'Bakery', on_hand: 18, updated_at: 'x' },
  ]),
}));

// replace the describe body:
describe('RegisterScreen', () => {
  beforeEach(() => {
    useSession.setState({ cashier_id: 'c1', cashier_name: 'QA', role: 'cashier' });
  });

  it('renders the register header', () => {
    render(<RegisterScreen />);
    expect(screen.getByText('Hanoot')).toBeTruthy();
  });

  it('renders a product from the real catalog and adds it to the cart on tap', async () => {
    render(<RegisterScreen />);
    fireEvent.click(await screen.findByText('Sourdough Loaf'));
    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().lines[0]!.unit_price_minor).toBe(2500);
  });

  it('shows empty cart when no items', () => {
    expect(useCart.getState().lines).toHaveLength(0);
  });
});
```
(Mock with `importOriginal` so `findByBarcode` — still imported by `RegisterScreen` — keeps its real implementation.)

- [ ] **Step 6: Run the full pos suite + tsc** (nothing else should regress):

```
cd backend/apps/pos
npx tsc --noEmit
npx vitest run
```
Expected: tsc clean; all suites green (231 baseline + new CatalogBrowser/loadCatalogFromDb tests, − the 1 removed QUICK_TILES assertion).

- [ ] **Step 7: Delete any stale `.js` shadow** of the touched files (e.g. `tests/screens/RegisterScreen.test.js` if present — these are committed compiled shadows that vitest may also pick up), restart Vite, and commit:

```bash
git add backend/apps/pos/src/ui/screens/RegisterScreen.tsx backend/apps/pos/tests/screens/RegisterScreen.test.tsx
git commit -m "feat(pos): register right pane uses CatalogBrowser (real catalog, not QUICK_TILES)"
```

---

## TASK A3 — Favorites pinning  (OPTIONAL — fast-follow; only if approved)

Pin `variant_id`s in Dexie `config` (key `'register.favorites'`); Favorites tab filters to pinned rows; ★ toggle on each tile. Tabs (All items / Favorites) live in `CatalogBrowser`. **Defer unless the user opts in at approval** — the loop is already closed without it.

---

## Live Verification (binding completion bar — per feedback_full_scenario_testing)

Run the live stack (backend :9000, pos :9200, pg :5433). Drive with the Playwright MCP. **Unit-green is not "done."**

**Task B gate:**
- [ ] Load the register (`http://localhost:9200`, sign in QA Manager / 4242). Open console (`browser_console_messages`). Confirm **no** `/pos/alerts` 404 / CORS errors after load + one 30 s poll cycle.
- [ ] `curl`/network-check `GET /pos/alerts?vendor_id=v_test` → 200 with `{ alerts: [...] }` and an `access-control-allow-origin: http://localhost:9200` header.

**Task A gate (the closed loop):**
- [ ] As manager (PIN-gated manager mode) → Add Product: title "Loop Test Bun", price 3,000, dept Bakery, initial on-hand 5. Save → 201.
- [ ] Return to the register grid. Confirm "Loop Test Bun" **appears** with price **3,000 IQD** (not 0) and "5 in stock". Confirm search ("loop") filters to it; the **Bakery** chip filters to it.
- [ ] Click the tile → it lands in the cart at 3,000. Click Charge → Payment shows **3,000 IQD** total. Tender cash → sale completes; stock decrements.
- [ ] Visual pass (per directive): colours/theme match the dark register, tiles aligned, labels correct, empty state renders for a vendor with no products. Screenshot each state.
- [ ] Fix anything found before declaring done.

---

## Self-Review (done by planner)

- **Spec coverage:** Task B = gap #3 (alerts flood) ✓. Task A1 = price bug (deepest root cause) ✓. Task A2 = gap #2 (grid from real catalog) ✓ + barcode-scan now works (Dexie populated) ✓. Task C explicitly deferred ✓.
- **Type consistency:** `CatalogRow` / `CatalogSnapshot.items` / snapshot route all gain the same 4 fields (`thumb_emoji`, `merch_category_id`, `category_name`, plus existing `on_hand`). `onPick(row: CatalogRow)` ↔ `handlePick(row: CatalogRow)` ↔ test `onPick` ✓. `loadCatalogFromDb` name identical across catalog-sync.ts, both tests, and CatalogBrowser ✓.
- **No placeholders:** every code step shows real code; commands have expected output.
- **Design gate:** Task A2 is the only net-new UI; mockup `docs/mockups/h3-2e/register-catalog.html` produced + pending user approval before A2 starts ✓.
