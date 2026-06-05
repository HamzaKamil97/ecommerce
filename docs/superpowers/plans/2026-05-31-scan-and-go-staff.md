# Scan & Go (staff-first) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A staff member scans/searches items to build a customer's cart (live stock-validated), sends it to the cashier by a short code/QR; the cashier loads the cart, prices weighed items, takes cash → WMS decrements.

**Architecture:** New `scan_cart` Medusa module (server-side cart state machine) + staff/POS-authed endpoints; the cashier "collect" reuses the existing `posTerminalService.recordSale` (atomic WMS decrement). Item lookup reuses the existing `catalog-snapshot` (barcode + price + stock) cached client-side, with a live stock re-check per scan and a hard re-validate at collect. New phone-first PWA `apps/scan-go` (reuses the POS Vite/PWA scaffold). A thin "Scan & Go cart" view is added to the POS for the cashier.

**Tech Stack:** Medusa v2 (`backend/apps/backend`, PG :5433), Vite PWA (new `apps/scan-go` :9400), POS (`apps/pos` :9200), Jest (HTTP + module integration), Vitest (frontend), Playwright (live verify).

**Spec:** `docs/superpowers/specs/2026-05-31-scan-and-go-staff-design.md`. **Mockups (visual contract):** `docs/mockups/j-picker/index.html`. **Research:** memory `reference_scan_and_go.md`.
**Branch:** `phase-j-picker-app` (already cut off `main`).

## Locked design rules (from spec — enforce in code)
- **Cart = server-side state; the QR/code is an opaque pointer** (cart id / `short_code`). Never trust a client-supplied total.
- **Lock on send:** lines mutable only while `status='OPEN'`. `send` → `PENDING_CASHIER`, stamps `locked_at`/`expires_at`, generates a single-use `short_code` (~15 min). Editing a locked cart is rejected (client must start a new cart).
- **Stock: validate on scan (read-only), decrement at the cashier** via `recordSale`. Optional soft-reservation on send (reuse `wmsService.createReservation`, 15-min TTL). Never decrement/reserve on scan.
- **Cashier is money authority** — collect = `recordSale` (cash) → decrement → cart `PAID`.

## Carry-forward conventions (Medusa v2 + POS — MANDATORY)
- Service keys: `scanCartService` (new), `posTerminalService`, `wmsService`. `MedusaService({Foo})` registration; module `index.ts` exports `Module(KEY, {service})`.
- BigNumber columns need BOTH `<col>` NUMERIC and `raw_<col>` JSONB in raw migrations. IQD `_minor` columns are whole dinars.
- Migrations via `@medusajs/framework/mikro-orm/migrations`; apply `npx medusa db:migrate`.
- HTTP + module integration suites run **ONE FILE AT A TIME**: from `backend/apps/backend`:
  `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit "<one spec>"` (modules: `integration:modules`; pure unit: `integration:unit` with `*.unit.spec.ts`).
- `recordSale` is reached via `req.scope.resolve('posTerminalService')` OR `POST /admin/pos-terminal/sales`. Input: `{client_id, vendor_id, cashier_id, terminal_id, lines:[{variant_id, qty, unit_price_minor, name_snapshot}], paid_amount_minor, currency_code, client_created_at}`.
- WMS: `getStock(vendorId, variantId)→{on_hand,reserved,available}`; `createReservation({vendor_id,variant_id,qty,order_id})`; `releaseReservation({reservation_id,reason})`; valid movement `type`: `'restock'|'sale'|'pick'|'manual'|'adjustment'|'release'` (NOT 'receive').
- **POS PWA lessons (apply to the new app from day one):** env via `env.ts` bare `import.meta.env.VITE_*` constant (NEVER `(import.meta as any).env`); `VitePWA devOptions.enabled:false`; never let stale `.js` shadow `.tsx`.
- Catalog read: `GET /admin/pos-terminal/catalog-snapshot?vendor_id=` returns `[{variant_id, title, barcode, price_minor, department, ...}]` (vendor catalog filtered by `metadata.created_by_vendor_id`). Surface a `weigh_at_counter` flag from product metadata.

---

## File Structure

**Backend (`backend/apps/backend/src`):**
- `modules/scan_cart/models/scan-cart.model.ts`, `scan-cart-line.model.ts` — cart + lines.
- `modules/scan_cart/{types.ts,service.ts,index.ts}` — service key `scanCartService`.
- `modules/scan_cart/migrations/Migration2026053113xxxx.ts` — tables.
- `modules/scan_cart/__tests__/scan-cart.spec.ts` — module integration.
- `api/pos/scan/lookup/route.ts` — GET item lookup (barcode/name) + live stock.
- `api/pos/scan-carts/route.ts` — POST create.
- `api/pos/scan-carts/[id]/lines/route.ts` — POST add line.
- `api/pos/scan-carts/[id]/lines/[lineId]/route.ts` — PATCH qty / DELETE.
- `api/pos/scan-carts/[id]/send/route.ts` — POST lock + short_code.
- `api/pos/scan-carts/by-code/[code]/route.ts` — GET by code (re-validate stock; lazy-expire).
- `api/pos/scan-carts/[id]/collect/route.ts` — POST cashier collect (recordSale + PAID).
- `integration-tests/http/scan-cart.spec.ts`, `scan-cart-collect.spec.ts` — HTTP.
- Add `scan_cart` to `medusa-config.ts` modules (with `dependencies:['wmsService','posTerminalService']`).

**Frontend new app (`backend/apps/scan-go`):**
- `package.json`, `vite.config.ts`, `index.html`, `tsconfig.json`, `.env`, `src/env.ts`, `src/main.tsx`, `src/App.tsx`, `src/routes.tsx`.
- `src/ui/tokens.css`, `fonts.css` (copied from pos), `src/pwa/*` (theme/register).
- `src/api/{client.ts,scan.ts}` — backend client + scan/cart calls.
- `src/state/{catalog.ts,cart.ts,session.ts}` — catalog cache, cart store, staff session.
- `src/state/__tests__/cart.unit.spec.ts`, `catalog.unit.spec.ts` — vitest.
- `src/ui/screens/{LoginScreen,ScanScreen,SearchScreen,CartReviewScreen,CodeScreen}.tsx`.
- `src/ui/components/{TotalBar,ScanViewport,CartRow,Toast}.tsx`.

**Cashier surface (POS, `backend/apps/pos`):**
- `src/api/scanCarts.ts` — load-by-code + collect client.
- `src/ui/screens/ScanCartScreen.tsx` + route in `src/routes.tsx` (`/scan-cart`).
- `tests/api/scanCarts.test.ts` — vitest.

---

# GROUP A — Backend: scan_cart module + endpoints

> Approval gate: Group A ends after A5 (all HTTP/module green).

## Task A1: scan_cart module (models, service, migration)

**Files:** create `modules/scan_cart/models/scan-cart.model.ts`, `scan-cart-line.model.ts`, `types.ts`, `service.ts`, `index.ts`, `migrations/Migration20260531130000.ts`; test `modules/scan_cart/__tests__/scan-cart.spec.ts`. Modify `medusa-config.ts`.

- [ ] **Step 1: Write the failing module test**
`modules/scan_cart/__tests__/scan-cart.spec.ts`:
```ts
import { moduleIntegrationTestRunner } from '@medusajs/test-utils';
import ScanCartModule from '../index';
import ScanCartService from '../service';

moduleIntegrationTestRunner<ScanCartService>({
  moduleName: 'scanCartService',
  moduleModels: [require('../models/scan-cart.model').ScanCart, require('../models/scan-cart-line.model').ScanCartLine],
  resolve: '.',
  testSuite: ({ service }) => {
    it('creates an OPEN cart, adds lines, locks with a short_code, finds by code', async () => {
      const c = await service.createCart({ vendor_id: 'v1', staff_id: 's1' });
      expect(c.status).toBe('OPEN');
      await service.addLine(c.id, { variant_id: 'va', title: 'A', qty: 2, unit_price_minor: 1000 });
      const locked = await service.send(c.id);
      expect(locked.status).toBe('PENDING_CASHIER');
      expect(locked.short_code).toMatch(/^[A-Z0-9]{5,6}$/);
      const found = await service.getByCode(locked.short_code);
      expect(found.id).toBe(c.id);
      expect(found.lines.length).toBe(1);
    });
    it('rejects edits once locked', async () => {
      const c = await service.createCart({ vendor_id: 'v1', staff_id: 's1' });
      await service.addLine(c.id, { variant_id: 'vb', title: 'B', qty: 1, unit_price_minor: 500 });
      await service.send(c.id);
      await expect(service.addLine(c.id, { variant_id: 'vc', title: 'C', qty: 1, unit_price_minor: 500 }))
        .rejects.toThrow(/not open/i);
    });
  },
});
```
> If `moduleIntegrationTestRunner` signature differs from what's in the repo, mirror an existing module test (e.g. `modules/online_order/__tests__/online-order.spec.ts`) exactly — match its harness.

- [ ] **Step 2: Run — verify FAIL**
`TEST_TYPE=integration:modules NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit modules/scan_cart/__tests__/scan-cart.spec.ts` → FAIL (module missing).

- [ ] **Step 3: Models**
`models/scan-cart.model.ts`:
```ts
import { model } from '@medusajs/framework/utils';
import { ScanCartLine } from './scan-cart-line.model';
export const ScanCart = model.define('scan_cart', {
  id: model.id({ prefix: 'sc' }).primaryKey(),
  vendor_id: model.text().index(),
  staff_id: model.text().nullable(),
  short_code: model.text().nullable().index(),
  status: model.enum(['OPEN','PENDING_CASHIER','PAID','EXPIRED','VOID']).default('OPEN'),
  locked_at: model.dateTime().nullable(),
  expires_at: model.dateTime().nullable(),
  paid_sale_id: model.text().nullable(),
  lines: model.hasMany(() => ScanCartLine, { mappedBy: 'cart' }),
});
```
`models/scan-cart-line.model.ts`:
```ts
import { model } from '@medusajs/framework/utils';
import { ScanCart } from './scan-cart.model';
export const ScanCartLine = model.define('scan_cart_line', {
  id: model.id({ prefix: 'scl' }).primaryKey(),
  cart: model.belongsTo(() => ScanCart, { mappedBy: 'lines' }),
  variant_id: model.text(),
  title: model.text(),
  qty: model.number().default(1),
  unit_price_minor: model.bigNumber().default(0),
  weigh_at_counter: model.boolean().default(false),
  priced: model.boolean().default(true),
});
```

- [ ] **Step 4: Types + service**
`types.ts`:
```ts
export type ScanCartStatus = 'OPEN'|'PENDING_CASHIER'|'PAID'|'EXPIRED'|'VOID';
export type AddLineInput = { variant_id: string; title: string; qty: number; unit_price_minor: number; weigh_at_counter?: boolean };
```
`service.ts`:
```ts
import { MedusaService } from '@medusajs/framework/utils';
import { randomBytes } from 'crypto';
import { ScanCart } from './models/scan-cart.model';
import { ScanCartLine } from './models/scan-cart-line.model';
import { AddLineInput, ScanCartStatus } from './types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
const TTL_MS = 15 * 60 * 1000;

class Base extends MedusaService({ ScanCart, ScanCartLine }) {}
export class ScanCartService extends Base {
  private genCode(): string {
    const b = randomBytes(6);
    let out = '';
    for (let i = 0; i < 6; i++) out += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
    return out;
  }
  async createCart(input: { vendor_id: string; staff_id?: string | null }) {
    const row = await (this as any).createScanCarts({ vendor_id: input.vendor_id, staff_id: input.staff_id ?? null, status: 'OPEN' });
    return Array.isArray(row) ? row[0] : row;
  }
  private async requireOpen(id: string) {
    const [rows] = await (this as any).listAndCountScanCarts({ id });
    if (!rows.length) { const e: any = new Error('cart not found'); e.code = 'not_found'; throw e; }
    if (rows[0].status !== 'OPEN') throw new Error(`cart ${id} is ${rows[0].status}, not open`);
    return rows[0];
  }
  async addLine(cartId: string, l: AddLineInput) {
    await this.requireOpen(cartId);
    const created = await (this as any).createScanCartLines({
      cart_id: cartId, variant_id: l.variant_id, title: l.title, qty: l.qty,
      unit_price_minor: l.unit_price_minor, weigh_at_counter: l.weigh_at_counter ?? false,
      priced: !(l.weigh_at_counter ?? false),
    });
    return Array.isArray(created) ? created[0] : created;
  }
  async updateLine(cartId: string, lineId: string, patch: { qty?: number; unit_price_minor?: number; priced?: boolean }) {
    await this.requireOpen(cartId);
    const updated = await (this as any).updateScanCartLines({ id: lineId, ...patch });
    return Array.isArray(updated) ? updated[0] : updated;
  }
  async removeLine(cartId: string, lineId: string) {
    await this.requireOpen(cartId);
    await (this as any).deleteScanCartLines(lineId);
    return { ok: true as const };
  }
  async send(cartId: string) {
    await this.requireOpen(cartId);
    const now = new Date();
    const short_code = this.genCode();
    const updated = await (this as any).updateScanCarts({
      id: cartId, status: 'PENDING_CASHIER', short_code, locked_at: now,
      expires_at: new Date(now.getTime() + TTL_MS),
    });
    return Array.isArray(updated) ? updated[0] : updated;
  }
  async getWithLines(id: string) {
    const [rows] = await (this as any).listAndCountScanCarts({ id });
    if (!rows.length) return null;
    const [lines] = await (this as any).listAndCountScanCartLines({ cart_id: id }, { order: { created_at: 'ASC' } });
    return { ...rows[0], lines };
  }
  async getByCode(code: string) {
    const [rows] = await (this as any).listAndCountScanCarts({ short_code: code });
    if (!rows.length) return null;
    return this.getWithLines(rows[0].id);
  }
  async transition(id: string, to: ScanCartStatus, extra: Record<string, any> = {}) {
    const updated = await (this as any).updateScanCarts({ id, status: to, ...extra });
    return Array.isArray(updated) ? updated[0] : updated;
  }
}
export default ScanCartService;
```
`index.ts`:
```ts
import { Module } from '@medusajs/framework/utils';
import { ScanCartService } from './service';
export const SCAN_CART_MODULE = 'scanCartService';
export default Module(SCAN_CART_MODULE, { service: ScanCartService });
```

- [ ] **Step 5: Migration**
`migrations/Migration20260531130000.ts` — raw SQL creating `scan_cart` and `scan_cart_line` (dual-column for `unit_price_minor`: `unit_price_minor numeric` + `raw_unit_price_minor jsonb`). Mirror an existing module migration (e.g. `modules/online_order/migrations/Migration20260528000003.ts`) for column/index/timestamps style. Index `scan_cart(vendor_id)`, partial index `scan_cart(short_code) WHERE deleted_at IS NULL`, `scan_cart_line(cart_id)`.

- [ ] **Step 6: Register module** — in `medusa-config.ts` add `{ resolve: './src/modules/scan_cart', dependencies: ['wmsService','posTerminalService'] }` to the modules array (match the existing entries' shape).

- [ ] **Step 7: Migrate + run test — verify PASS**
`npx medusa db:migrate` then re-run Step 2 cmd → PASS (2 tests).

- [ ] **Step 8: Commit**
```
git add backend/apps/backend/src/modules/scan_cart backend/apps/backend/medusa-config.ts
git commit -m "feat(scan-go): scan_cart module — server-side cart state machine + short_code lock"
```

## Task A2: Cart HTTP endpoints (create / add / update / remove / send / by-code)

**Files:** create the 5 route files under `api/pos/scan-carts/...` (see File Structure); test `integration-tests/http/scan-cart.spec.ts`.

- [ ] **Step 1: Failing HTTP test** — `integration-tests/http/scan-cart.spec.ts` exercises: POST create → POST add line → PATCH qty → POST send (returns `short_code`, status PENDING_CASHIER) → GET by-code returns the cart+lines → POST add line after send → 409. Mirror the harness of `integration-tests/http/pos-online-orders.spec.ts` (`{ api, getContainer }`). Assert `short_code` shape and that a 2nd send/edit is rejected.

- [ ] **Step 2: Run — FAIL** (routes missing).

- [ ] **Step 3: Implement routes** — each resolves `req.scope.resolve('scanCartService')`, sets `req.audit_context = { vendor_id }` before mutations:
  - `scan-carts/route.ts` POST: `{vendor_id, staff_id?}` → `createCart` → 201 `{cart}`.
  - `scan-carts/[id]/lines/route.ts` POST: body `{variant_id,title,qty,unit_price_minor,weigh_at_counter?}` → `addLine` (catch "not open" → 409) → `{line}`.
  - `scan-carts/[id]/lines/[lineId]/route.ts` PATCH `{qty?,unit_price_minor?,priced?}` → `updateLine`; DELETE → `removeLine`. (409 if not open.)
  - `scan-carts/[id]/send/route.ts` POST → `send` → `{cart}` (with `short_code`). (409 if not open.)
  - `scan-carts/by-code/[code]/route.ts` GET → `getByCode`; null → 404. **Lazy-expire:** if `status==='PENDING_CASHIER'` and `expires_at < now` → `transition(id,'EXPIRED')` + 410 `{error:'cart expired'}`.

- [ ] **Step 4: Run — PASS.** (Single file: `... npx jest ... integration-tests/http/scan-cart.spec.ts`.)

- [ ] **Step 5: Commit** `feat(scan-go): cart endpoints (create/add/update/send/by-code, lock + lazy-expire)`.

## Task A3: Item lookup endpoint (barcode + name + live stock)

**Files:** create `api/pos/scan/lookup/route.ts`; test `integration-tests/http/scan-lookup.spec.ts`.

- [ ] **Step 1: Failing test** — seed a vendor product+variant (with a barcode) and WMS stock; assert `GET /pos/scan/lookup?vendor_id=&barcode=<b>` → `{found:true, variant_id, title, price_minor, qty_available>0, sellable:true}`; an out-of-stock variant → `sellable:false`; unknown barcode → `{found:false}`; `?q=<name>` returns matches. (Mirror catalog-snapshot's seeding/harness; reuse its product+price+stock approach.)

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** — resolve `product`, `wmsService`, PG. Reuse the **catalog-snapshot** query approach (list vendor products via `metadata.created_by_vendor_id`, price via `product_variant_price_set→price`, `weigh_at_counter` from product metadata). For `?barcode=`: find the variant whose `barcode` matches; for `?q=`: title contains (case-insensitive). For each candidate call `wms.getStock(vendor_id, variant_id)` → `qty_available = available`; `sellable = qty_available > 0 || weigh_at_counter`. Return `{found, variant_id, title, price_minor, qty_available, weigh_at_counter, sellable}` (or `{found:false}`). Refactor the snapshot query into a shared helper if cleaner — don't duplicate the raw SQL.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Commit** `feat(scan-go): item lookup endpoint (barcode/name + live stock validation)`.

## Task A4: Cashier collect (recordSale → decrement → PAID)

**Files:** create `api/pos/scan-carts/[id]/collect/route.ts`; test `integration-tests/http/scan-cart-collect.spec.ts`.

- [ ] **Step 1: Failing test** — create+lock a cart (vendor `v_sc`, one normal line qty 2 @1000, one weigh line `priced:false`); seed WMS stock for both variants; `POST /pos/scan-carts/:id/collect` body `{cashier_id, terminal_id, priced_lines:[{line_id, unit_price_minor}], paid_amount_minor}`. Assert: 200, cart `status='PAID'`, `paid_sale_id` set, and `wms.getStock` shows **on_hand decremented** by the sold qty for both variants. Also: collecting an already-PAID cart → 409; an unpriced weigh line with no price supplied → 400.

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** — resolve `scanCartService` + `posTerminalService`. Load `getWithLines(id)`; 404 if missing; 409 if `status!=='PENDING_CASHIER'`. Apply `priced_lines` (update those lines' `unit_price_minor` + `priced=true` via a direct line update — allowed even when locked, since this is the cashier path: add a `priceLine(id, lineId, price)` service method that bypasses the OPEN guard but only when cart is PENDING_CASHIER). If any line still `priced=false` → 400. Build `recordSale` input: `{client_id: cart.id, vendor_id, cashier_id, terminal_id, currency_code:'iqd', client_created_at: new Date().toISOString(), paid_amount_minor, lines: cart.lines.map(l=>({variant_id, qty, unit_price_minor, name_snapshot: title}))}`. Call `posTerminalService.recordSale(input)` (decrements WMS atomically). On success: `scanCartService.transition(id,'PAID',{paid_sale_id: result.sale_id})`. Return `{cart, sale: result}`. (recordSale throws on insufficient stock → map to 409.)

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Commit** `feat(scan-go): cashier collect — recordSale decrements WMS, cart → PAID`.

## Task A5: Group-A regression
- [ ] Run all four new specs individually (one at a time) + confirm `pos-online-orders.spec.ts` still green (recordSale untouched). Commit nothing (verification only); report results.

---

# GROUP B — Scan & Go PWA (`apps/scan-go`)

> Frontend tasks: component-level. The **mockup is the visual contract**; pure logic is unit-tested; the real UI gate is the Group D live walk.

## Task B1: Scaffold the app
**Files:** create `backend/apps/scan-go/{package.json, vite.config.ts, index.html, tsconfig.json, .env, src/env.ts, src/main.tsx, src/App.tsx, src/routes.tsx, src/ui/tokens.css, src/ui/fonts.css, src/pwa/theme.ts, src/pwa/register-sw.ts}`.

- [ ] **Step 1: Copy the POS scaffold** — base every file on `backend/apps/pos`'s equivalent. Key differences:
  - `package.json`: `"dev": "vite --port 9400 --host"`, name `@hanoot/scan-go`; same deps as pos (react, react-router-dom, zustand, vite-plugin-pwa, etc.).
  - `vite.config.ts`: copy pos's, **`VitePWA({ ..., devOptions: { enabled: false } })`** (the stale-SW lesson).
  - `src/env.ts` (EXACT pattern — do NOT use `(import.meta as any).env` anywhere):
    ```ts
    export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:9000';
    export const VENDOR_ID = import.meta.env.VITE_VENDOR_ID ?? '';
    export const TERMINAL_ID = import.meta.env.VITE_TERMINAL_ID ?? 'scango_dev';
    ```
  - `.env`: `VITE_API_BASE=http://localhost:9000`, `VITE_VENDOR_ID=<set at verify time>`, `VITE_TERMINAL_ID=scango_dev`, plus the dev-admin shim vars copied from pos `.env`.
  - Copy `tokens.css` + `fonts.css` verbatim from pos (shared identity).
  - `src/routes.tsx`: routes `/` (ScanScreen, guarded by staff session), `/search`, `/cart`, `/code/:id`, `/login`.
- [ ] **Step 2: Smoke** — `cd backend/apps/scan-go && npm install && npm run dev`; `curl -s -o /dev/null -w "%{http_code}" http://localhost:9400/` → 200; `curl -s http://localhost:9400/src/env.ts | grep VITE_VENDOR_ID` shows the injected value (proves env wiring). Stop the server.
- [ ] **Step 3: Commit** `chore(scan-go): scaffold phone-first PWA (port 9400, dev SW off, env.ts pattern)`.

## Task B2: Catalog cache + cart store + lookup logic (unit-tested)
**Files:** create `src/api/{client.ts,scan.ts}`, `src/state/{catalog.ts,cart.ts,session.ts}`, tests `src/state/__tests__/{cart.unit.spec.ts,catalog.unit.spec.ts}`. Add vitest config (copy pos's if present, else minimal jsdom config like the storefront's).

- [ ] **Step 1: Failing unit tests**
  - `catalog.unit.spec.ts`: a `findByBarcode(catalog, code)` returns the variant or undefined; `searchByName(catalog, 'tom')` filters case-insensitively; `isSellable(stock, weigh)` = `available>0 || weigh`.
  - `cart.unit.spec.ts`: cart store `addItem` appends + recomputes `subtotal_minor` (excludes `weigh_at_counter` lines from subtotal, counts them in `item_count`); `incQty/decQty/removeItem`; `lock()` sets `locked=true` and blocks further `addItem` (throws/no-op).
- [ ] **Step 2: Run — FAIL** (`TEST_TYPE`/vitest as configured; from `apps/scan-go`: `npx vitest run`).
- [ ] **Step 3: Implement** — `catalog.ts` (load `/admin/pos-terminal/catalog-snapshot?vendor_id=` into an in-memory index: `byBarcode`, `list`, plus pure helpers `findByBarcode/searchByName/isSellable`); `scan.ts` (`lookupBarcode`, `lookupName` call `/pos/scan/lookup`; cart CRUD calls the A2 endpoints; `sendCart`, `getByCode`); `cart.ts` (zustand store with the tested reducers); `session.ts` (staff PIN via existing `/admin/pos-terminal/cashiers` + `verifyCashierPin`, reuse pos's pattern).
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Commit** `feat(scan-go): catalog cache + cart store + lookup (unit-tested)`.

## Task B3: Screens + components
**Files:** create the 5 screens + 4 components (see File Structure). Visual contract = `docs/mockups/j-picker/index.html` screens 1–6.

- [ ] **Step 1:** Build each screen to match the mockup, wiring the B2 state/api:
  - `LoginScreen` — PIN pad → `session` (reuse pos LoginScreen pattern).
  - `ScanScreen` — `TotalBar` (live subtotal + item count, Arabic numerals), `ScanViewport` (camera/HID barcode input; on scan → `lookupBarcode` → if `sellable` add to cart + green `Toast`, else red `Toast` "not added · غير متوفر"), cart list (`CartRow` with stepper), footer "Send to cashier".
  - `SearchScreen` — name typeahead → `lookupName` results (OOS greyed, weigh tag) → add.
  - `CartReviewScreen` — steppers, weigh-at-counter flag, subtotal, "Send to cashier" → `sendCart` → navigate `/code/:id`.
  - `CodeScreen` — show `short_code` big + a QR (use a tiny QR lib or render the code as text + a placeholder per mockup), expiry countdown, "cart locked".
- [ ] **Step 2:** Where a screen has non-trivial pure logic (e.g. the scan→add decision, the OOS toast branch), add a small vitest. Keep screens thin; push logic into B2 (already tested).
- [ ] **Step 3: Typecheck** `npx tsc --noEmit` (0 new errors). **Delete any stale `.js`** before finishing (`find src -name '*.js' -delete`).
- [ ] **Step 4: Commit** `feat(scan-go): scan/search/cart/code screens (visual contract = mockup)`.

---

# GROUP C — Cashier surface (POS)

## Task C1: POS "Scan & Go cart" view
**Files:** create `apps/pos/src/api/scanCarts.ts`, `apps/pos/src/ui/screens/ScanCartScreen.tsx`; modify `apps/pos/src/routes.tsx` (+`/scan-cart`); test `apps/pos/tests/api/scanCarts.test.ts`.

- [ ] **Step 1: Failing vitest** — `scanCarts.ts`: `loadByCode(code)` calls `GET /pos/scan-carts/by-code/:code`; `collect(id, {cashier_id, terminal_id, priced_lines, paid_amount_minor})` POSTs `/pos/scan-carts/:id/collect`; a `buildPricedLines(lines, prices)` helper maps weigh lines to `{line_id, unit_price_minor}` and throws if a weigh line is unpriced. Test the client calls + the helper (mirror `apps/pos/tests/api/*` patterns: `vi.mock` the http client).
- [ ] **Step 2: Run — FAIL** (`cd apps/pos && npx vitest run tests/api/scanCarts.test.ts`).
- [ ] **Step 3: Implement** `scanCarts.ts` + `ScanCartScreen.tsx` (code entry → `loadByCode` → list lines, inline price inputs for weigh-at-counter lines, "Cash due" total → "Collect cash & finish" → `collect` → success). Use `VENDOR_ID`/cashier session from pos env/session. Route `/scan-cart` (RequireCashier). Visual contract = mockup screen 7.
- [ ] **Step 4: Run — PASS.** Confirm `npx tsc --noEmit` clean in pos; delete stale `.js`.
- [ ] **Step 5: Commit** `feat(scan-go): POS cashier load-by-code + collect view`.

---

# GROUP D — Live verification (Playwright) — GATE

**Binding (feedback_full_scenario_testing): live, one snapshot → one action. Evidence before assertions.**

- [ ] **Step 1: Stack + seed** — backend :9000, POS :9200, scan-go :9400, PG :5433 up. Run `seed-loop-test.ts` (equips a tenant with stock + cashier). Set `apps/scan-go/.env` `VITE_VENDOR_ID` to that tenant id; restart scan-go (clear SW if any). The chosen tenant's variants must have barcodes — if not, set barcodes on 2–3 variants via the manager flow / SQL, and one `weigh_at_counter` product via metadata.
- [ ] **Step 2: Staff builds a cart** — Playwright on :9400 → PIN login → scan/enter a known in-stock barcode → assert it's added + total updates; enter an out-of-stock barcode → assert red toast + NOT added; search a no-barcode item → add; add the weigh-at-counter item. One snapshot → one action.
- [ ] **Step 3: Send → lock** — tap "Send to cashier" → assert navigates to the code screen with a `short_code`. DB: `SELECT status, short_code FROM scan_cart ORDER BY created_at DESC LIMIT 1` → `PENDING_CASHIER` + code. Attempt an edit via API → 409 (proves lock).
- [ ] **Step 4: Cashier collects** — Playwright on :9200 → `/scan-cart` → enter the `short_code` → assert the cart loads → enter a price for the weigh line → "Collect cash & finish". DB: cart `status='PAID'`, `paid_sale_id` set; `wms_stock_pool` on_hand **decremented** for the scanned variants; a `pos_sale` row exists.
- [ ] **Step 5: Negative** — load an expired/already-PAID code → assert the cashier UI shows the right error (410/409). Screenshot the key states.
- [ ] **Step 6: Report + gate.** Screenshots + DB/API assertions. STOP for approval.

---

## After the gate
1. Full regression: scan-go vitest, pos vitest, the changed backend specs (one at a time).
2. `superpowers:finishing-a-development-branch` → merge `phase-j-picker-app` to **local main**. Ask before any origin push (origin auto-deploys).
3. Write `project_phase_j_scan_go_done.md` memory + update MEMORY.md + orchestrator_state. Carry-forwards: cart=server-state+short_code lock; collect=recordSale; lookup reuses catalog-snapshot; the **customer/visitor self-scan** rollout is the deferred follow-up.

## Self-Review notes
- **Spec coverage:** cart state machine + lock → A1/A2; validate-on-scan → A3 + B2; decrement-at-cashier via recordSale → A4; short_code tamper-proofing (server-side, lock, lazy-expire, single-use) → A1/A2; no-barcode/name-search + weigh-at-counter → A3/B2/B3/C1; staff PWA → B1–B3; cashier surface → C1; live loop → D.
- **Type consistency:** `scanCartService` methods (createCart/addLine/updateLine/removeLine/send/getByCode/getWithLines/transition/priceLine) referenced consistently across A2/A4; `RecordSaleInput` shape matches the codebase (A4); `weigh_at_counter`/`priced` line fields consistent across model/service/endpoints/UI.
- **Flagged unknowns (resolve at task time):** exact `moduleIntegrationTestRunner` signature (mirror an existing module test); whether `weigh_at_counter` is best as product metadata vs a catalog_schema field (default: product metadata, surfaced by lookup/snapshot); whether to add the optional soft-reservation on send (default: skip in v1 — decrement at collect is sufficient; note it as a follow-up); QR rendering lib choice (small dep vs render code-only).
