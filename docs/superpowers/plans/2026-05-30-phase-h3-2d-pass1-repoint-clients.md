# Phase H-3.2d · Pass 1 — Re-point PoS api clients to existing endpoints

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 3 manager screens (Catalog rail, Departments, PIN reset) load real data by re-pointing their PoS api clients away from endpoints that 404 (`/admin/departments*`, `/admin/staff`) and onto endpoints that already exist (`/admin/tenants/:id/merch-categories`, `/admin/pos-terminal/cashiers`), mapping each response shape to the type the screen already consumes.

**Architecture:** Frontend-only change inside `backend/apps/pos/src/api/*.ts` plus one call-site signature edit in `DepartmentsScreen.tsx`. No backend code changes (the target routes shipped earlier; the reorder route shipped in H-3.2c task A4). Because the screen unit tests **mock these api clients**, a wrong URL or response shape would NOT fail them — so the DoD for every re-point is a new **api-client-level test** that mocks the `./client` transport layer and asserts (a) the exact path/method called and (b) the response→type mapping. Live Playwright verification is a final optional acceptance step.

**Tech Stack:** React 18 + TypeScript PoS app at `:9200`, Vitest + jsdom, `vi.mock`/`vi.fn` (NO `@testing-library/user-event` — not installed). Backend is Medusa v2 at `:9000` (unchanged this pass).

---

## Context the executor MUST know

- **Branch:** stay on `phase-h3-2c-manager-surfaces` (HEAD `d6fe7ff`). Do NOT cut a new branch — manager mode ships as one unit.
- **Two `listDepartments` exist and both 404 today.** `backend/apps/pos/src/api/catalog.ts` has its own `Department` type + `listDepartments` (consumed by `CatalogListScreen` rail + chip rail). `backend/apps/pos/src/api/departments.ts` has another `Department` type + `listDepartments` (consumed by `DepartmentsScreen`). BOTH must be re-pointed.
- **Target merch-categories routes (already exist, verified):**
  - `GET  /admin/tenants/:tenantId/merch-categories` → `{ merch_categories: MerchCategory[] }`
  - `POST /admin/tenants/:tenantId/merch-categories` → `201 { merch_category }` (body `{ name, handle?, icon_url? }`; 409 on duplicate handle)
  - `PATCH /admin/tenants/:tenantId/merch-categories/:id` → `{ merch_category }` (accepts `name`, `position`, `icon_url`)
  - `DELETE /admin/tenants/:tenantId/merch-categories/:id` → `204`
- **`MerchCategory` row shape** (`backend/apps/backend/src/modules/merch/models/merch-category.ts`): `{ id, tenant_id, handle, name, position, icon_url }`. There is **no `product_count`** — both screens already guard for its absence (`dept.product_count !== undefined`), so leaving it `undefined` is correct.
- **Target cashiers route (already exists, verified):** `GET /admin/pos-terminal/cashiers?vendor_id=` → `{ cashiers: Cashier[] }` where each cashier is `{ id, vendor_id, name, role, active, pin_hash_prefix }`. It does **NOT** include `permission_overrides` or `last_active_at`. `PinResetScreen.resolveLabel` reads `row.permission_overrides[key]`, so the mapper MUST default `permission_overrides` to `{}` or the screen throws a TypeError on render.
- **`resetPin` is OUT OF SCOPE for Pass 1.** `POST /admin/pos-terminal/cashiers/:id/reset-pin` does not exist yet; it is built in Pass 2. Leave `resetPin` in `staff.ts` pointing where it is. The PIN-reset list will load; the reset action 404s until Pass 2 — acceptable for this pass.
- **`reorderDepartments` already works.** It targets `PUT /admin/departments/reorder`, which exists (H-3.2c A4) and updates `merch_category` rows. No change needed; we add a client test only to lock the contract.
- **Auth:** the PoS app sends a dev admin JWT (`api/client.ts` → `getDevAdminToken`). `requireTenantAccess` returns the requested tenant for `user`/`admin` actors, so admin-token calls to `/admin/tenants/:id/...` pass. In Vitest, `getDevAdminToken` returns `null` (MODE==='test') — irrelevant here because the api-client tests mock the `./client` module entirely.
- **VENDOR_ID === tenant_id** in this app: screens pass `VENDOR_ID` as the `tenantId` argument (see `DepartmentsScreen` line 25, `CatalogListScreen`). The merch-categories routes key on `tenant_id`. For live data to appear, `merch_category` rows must exist with `tenant_id = VENDOR_ID` (a data concern for live verify, not a code concern).
- **Test command:** `cd backend/apps/pos && npx vitest run <files>`. Full suite is 198 green today; keep it green.
- **No `@testing-library/user-event`** — use `fireEvent`. (Not needed in this pass; api tests have no DOM.)
- **Delete stale `.js` shadows** for any `.tsx` you touch before running the Vite dev server (not needed for `.ts` api files, but applies to `DepartmentsScreen.tsx`): `find backend/apps/pos/src/ui/screens/manager -name '*.js' -delete`.

## File structure

```
backend/apps/pos/src/api/
├── catalog.ts        # MODIFY — re-point listDepartments; add merchCategoryToDepartment mapper
├── departments.ts    # MODIFY — re-point listDepartments/createDepartment/updateDepartment (sig change); reorder unchanged
└── staff.ts          # MODIFY — re-point listStaff; map cashier→StaffRow (default permission_overrides={})

backend/apps/pos/src/ui/screens/manager/
└── DepartmentsScreen.tsx   # MODIFY — updateDepartment call site now passes tenantId

backend/apps/pos/tests/api/          # NEW directory
├── departments.test.ts   # NEW — path + mapping assertions for all 4 fns
├── catalog.test.ts       # NEW — path + mapping assertions for listDepartments
└── staff.test.ts         # NEW — path + mapping assertions for listStaff (incl. overrides default)
```

---

## Task 1: Re-point `departments.ts` + signature change + client tests

**Files:**
- Modify: `backend/apps/pos/src/api/departments.ts`
- Modify: `backend/apps/pos/src/ui/screens/manager/DepartmentsScreen.tsx` (one call site)
- Create: `backend/apps/pos/tests/api/departments.test.ts`

- [ ] **Step 1: Write the failing api-client test**

Create `backend/apps/pos/tests/api/departments.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  reorderDepartments,
} from '../../src/api/departments';

vi.mock('../../src/api/client', () => ({
  api: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

const mc = {
  id: 'mc_1', tenant_id: 'v_test', handle: 'dairy', name: 'Dairy',
  position: 2, icon_url: '🥛',
};

beforeEach(() => vi.clearAllMocks());

describe('departments api client', () => {
  it('listDepartments GETs the tenant merch-categories route and maps the rows', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ merch_categories: [mc] });
    const out = await listDepartments('v_test');
    expect(client.apiGet).toHaveBeenCalledWith('/admin/tenants/v_test/merch-categories');
    expect(out).toEqual([
      { id: 'mc_1', tenant_id: 'v_test', handle: 'dairy', name: 'Dairy', position: 2, icon_url: '🥛' },
    ]);
  });

  it('listDepartments returns [] when the payload is empty', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ merch_categories: [] });
    expect(await listDepartments('v_test')).toEqual([]);
  });

  it('createDepartment POSTs name/handle/icon to the tenant route and unwraps merch_category', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ merch_category: mc });
    const out = await createDepartment({ tenant_id: 'v_test', name: 'Dairy', handle: 'dairy' });
    expect(client.apiPost).toHaveBeenCalledWith('/admin/tenants/v_test/merch-categories', {
      name: 'Dairy', handle: 'dairy', icon_url: undefined,
    });
    expect(out).toEqual({
      id: 'mc_1', tenant_id: 'v_test', handle: 'dairy', name: 'Dairy', position: 2, icon_url: '🥛',
    });
  });

  it('updateDepartment PATCHes the tenant+id route and unwraps merch_category', async () => {
    vi.mocked(client.apiPatch).mockResolvedValue({ merch_category: { ...mc, name: 'Dairy & Eggs' } });
    const out = await updateDepartment('v_test', 'mc_1', { name: 'Dairy & Eggs' });
    expect(client.apiPatch).toHaveBeenCalledWith(
      '/admin/tenants/v_test/merch-categories/mc_1',
      { name: 'Dairy & Eggs' },
    );
    expect(out.name).toBe('Dairy & Eggs');
  });

  it('reorderDepartments PUTs the existing reorder route unchanged', async () => {
    vi.mocked(client.api).mockResolvedValue({ updated: 2 });
    const out = await reorderDepartments('v_test', [{ id: 'a', position: 0 }, { id: 'b', position: 1 }]);
    expect(client.api).toHaveBeenCalledWith('/admin/departments/reorder', {
      method: 'PUT',
      body: JSON.stringify({ tenant_id: 'v_test', order: [{ id: 'a', position: 0 }, { id: 'b', position: 1 }] }),
    });
    expect(out).toEqual({ updated: 2 });
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `cd backend/apps/pos && npx vitest run tests/api/departments.test.ts`
Expected: FAIL — `listDepartments` still calls `/admin/departments?tenant_id=...`, `createDepartment`/`updateDepartment` use wrong path/return raw payload, `updateDepartment` arity is wrong (TS/compile or assertion failure).

- [ ] **Step 3: Rewrite `departments.ts`**

Replace the full contents of `backend/apps/pos/src/api/departments.ts` with:

```typescript
import { api, apiGet, apiPost, apiPatch } from './client';

export type Department = {
  id: string;
  tenant_id: string;
  handle: string;
  name: string;
  position: number;
  icon_url?: string | null;
  product_count?: number;
};

// Backend merch_category row shape (backend merch module). No product_count.
type MerchCategory = {
  id: string;
  tenant_id: string;
  handle: string;
  name: string;
  position: number;
  icon_url?: string | null;
};

function toDepartment(mc: MerchCategory): Department {
  return {
    id: mc.id,
    tenant_id: mc.tenant_id,
    handle: mc.handle,
    name: mc.name,
    position: mc.position,
    icon_url: mc.icon_url ?? null,
    // product_count intentionally omitted — the merch route does not return it.
  };
}

export async function listDepartments(tenantId: string): Promise<Department[]> {
  const r = await apiGet<{ merch_categories?: MerchCategory[] }>(
    `/admin/tenants/${encodeURIComponent(tenantId)}/merch-categories`,
  );
  return (r.merch_categories ?? []).map(toDepartment);
}

export async function createDepartment(input: {
  tenant_id: string;
  name: string;
  handle: string;
  icon_url?: string | null;
}): Promise<Department> {
  const r = await apiPost<{ merch_category: MerchCategory }>(
    `/admin/tenants/${encodeURIComponent(input.tenant_id)}/merch-categories`,
    { name: input.name, handle: input.handle, icon_url: input.icon_url },
  );
  return toDepartment(r.merch_category);
}

export async function updateDepartment(
  tenantId: string,
  id: string,
  patch: { name?: string; icon_url?: string | null; position?: number },
): Promise<Department> {
  const r = await apiPatch<{ merch_category: MerchCategory }>(
    `/admin/tenants/${encodeURIComponent(tenantId)}/merch-categories/${encodeURIComponent(id)}`,
    patch,
  );
  return toDepartment(r.merch_category);
}

// Reorder still targets the dedicated H-3.2c A4 route, which updates merch_category rows.
export async function reorderDepartments(
  tenantId: string,
  order: { id: string; position: number }[],
): Promise<{ updated: number }> {
  return api('/admin/departments/reorder', {
    method: 'PUT',
    body: JSON.stringify({ tenant_id: tenantId, order }),
  });
}
```

- [ ] **Step 4: Update the `updateDepartment` call site in `DepartmentsScreen.tsx`**

In `backend/apps/pos/src/ui/screens/manager/DepartmentsScreen.tsx`, the `saveEdit` function calls `updateDepartment(id, { name: ... })`. Change it to pass the tenant id (the screen already has `const vendorId = VENDOR_ID;`):

```typescript
      await updateDepartment(vendorId, id, { name: draftName.trim() });
```

(That is the only `updateDepartment` call site — `createDepartment`, `listDepartments`, `reorderDepartments` call sites are unchanged.)

- [ ] **Step 5: Run the api test, confirm green**

Run: `cd backend/apps/pos && npx vitest run tests/api/departments.test.ts`
Expected: PASS — 5/5.

- [ ] **Step 6: Run the DepartmentsScreen unit test, confirm still green**

Run: `cd backend/apps/pos && npx vitest run tests/screens/manager/DepartmentsScreen.test.tsx`
Expected: PASS. The test mocks `updateDepartment` as `vi.fn()`, so the new arity is accepted. If any assertion checks the call arguments of `updateDepartment`, update it to expect `(vendorId, id, patch)`.

- [ ] **Step 7: Type-check**

Run: `cd backend/apps/pos && npx tsc --noEmit`
Expected: 0 errors. (If `tsc` script differs, use the project's typecheck command — check `package.json`.)

- [ ] **Step 8: Commit**

```bash
git add backend/apps/pos/src/api/departments.ts \
        backend/apps/pos/src/ui/screens/manager/DepartmentsScreen.tsx \
        backend/apps/pos/tests/api/departments.test.ts
git commit -m "fix(pos/api): re-point departments client to /admin/tenants/:id/merch-categories"
```

---

## Task 2: Re-point `catalog.ts` `listDepartments` + client test

**Files:**
- Modify: `backend/apps/pos/src/api/catalog.ts`
- Create: `backend/apps/pos/tests/api/catalog.test.ts`

**Scope guard:** ONLY `listDepartments` changes in this task. `listProducts` and `createProduct` stay exactly as they are — they are Pass 2 (the `/admin/products` route does not exist yet and catalog-snapshot can't feed the grouped catalog). Do not touch them.

- [ ] **Step 1: Write the failing api-client test**

Create `backend/apps/pos/tests/api/catalog.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import { listDepartments } from '../../src/api/catalog';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('catalog api client — listDepartments', () => {
  it('GETs the tenant merch-categories route and maps to Department[]', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      merch_categories: [
        { id: 'mc_1', tenant_id: 'v_test', handle: 'dairy', name: 'Dairy', position: 0, icon_url: '🥛' },
      ],
    });
    const out = await listDepartments('v_test');
    expect(client.apiGet).toHaveBeenCalledWith('/admin/tenants/v_test/merch-categories');
    expect(out).toEqual([
      { id: 'mc_1', handle: 'dairy', name: 'Dairy', position: 0, icon_url: '🥛' },
    ]);
  });

  it('returns [] on empty payload', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ merch_categories: [] });
    expect(await listDepartments('v_test')).toEqual([]);
  });
});
```

(Note: `catalog.ts`'s `Department` type has no `tenant_id` field, so the mapper omits it — the test asserts the catalog-flavored shape.)

- [ ] **Step 2: Run the test, confirm it fails**

Run: `cd backend/apps/pos && npx vitest run tests/api/catalog.test.ts`
Expected: FAIL — current `listDepartments` calls `/admin/departments?tenant_id=...` and returns `r.departments ?? r.rows ?? []` (so `apiGet` is called with the wrong path and the mapping is wrong).

- [ ] **Step 3: Re-point `catalog.ts` `listDepartments`**

In `backend/apps/pos/src/api/catalog.ts`, replace the `listDepartments` function with:

```typescript
type MerchCategory = {
  id: string;
  handle: string;
  name: string;
  position: number;
  icon_url?: string | null;
};

export async function listDepartments(tenantId: string): Promise<Department[]> {
  const r = await apiGet<{ merch_categories?: MerchCategory[] }>(
    `/admin/tenants/${encodeURIComponent(tenantId)}/merch-categories`,
  );
  return (r.merch_categories ?? []).map((mc) => ({
    id: mc.id,
    handle: mc.handle,
    name: mc.name,
    position: mc.position,
    icon_url: mc.icon_url ?? null,
    // product_count omitted — not returned by the merch route.
  }));
}
```

Leave `listProducts`, `createProduct`, and the `Product`/`Department`/`CreateProductInput` types untouched.

- [ ] **Step 4: Run the catalog api test, confirm green**

Run: `cd backend/apps/pos && npx vitest run tests/api/catalog.test.ts`
Expected: PASS — 2/2.

- [ ] **Step 5: Run the CatalogListScreen unit test, confirm still green**

Run: `cd backend/apps/pos && npx vitest run tests/screens/manager/CatalogListScreen.test.tsx`
Expected: PASS (it mocks the catalog api client).

- [ ] **Step 6: Type-check**

Run: `cd backend/apps/pos && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/pos/src/api/catalog.ts backend/apps/pos/tests/api/catalog.test.ts
git commit -m "fix(pos/api): re-point catalog listDepartments to merch-categories (products stay Pass 2)"
```

---

## Task 3: Re-point `staff.ts` `listStaff` + client test (overrides-safe mapping)

**Files:**
- Modify: `backend/apps/pos/src/api/staff.ts`
- Create: `backend/apps/pos/tests/api/staff.test.ts`

**Scope guard:** ONLY `listStaff` changes. `resetPin` stays pointing at `/admin/staff/:id/reset-pin` (its real endpoint is built in Pass 2). The critical correctness point: the cashiers route does NOT return `permission_overrides` or `last_active_at`, and `PinResetScreen.resolveLabel` dereferences `row.permission_overrides[key]`, so the mapper MUST default `permission_overrides` to `{}`.

- [ ] **Step 1: Write the failing api-client test**

Create `backend/apps/pos/tests/api/staff.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import { listStaff } from '../../src/api/staff';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('staff api client — listStaff', () => {
  it('GETs the pos-terminal cashiers route with vendor_id and maps cashier→StaffRow', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      cashiers: [
        { id: 'c_1', vendor_id: 'v_test', name: 'QA Manager', role: 'manager', active: true, pin_hash_prefix: 'abcd1234' },
      ],
    });
    const out = await listStaff('v_test');
    expect(client.apiGet).toHaveBeenCalledWith('/admin/pos-terminal/cashiers?vendor_id=v_test');
    expect(out).toEqual([
      {
        id: 'c_1',
        vendor_id: 'v_test',
        name: 'QA Manager',
        role: 'manager',
        permission_overrides: {},
        last_active_at: null,
      },
    ]);
  });

  it('defaults permission_overrides to {} so PinResetScreen.resolveLabel never throws', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      cashiers: [{ id: 'c_2', vendor_id: 'v_test', name: 'Hala', role: 'cashier', active: true, pin_hash_prefix: 'ef00' }],
    });
    const [row] = await listStaff('v_test');
    expect(row.permission_overrides).toEqual({});
    // dereference like the screen does — must not throw
    expect(row.permission_overrides['pos.refund_or_void']).toBeUndefined();
  });

  it('returns [] on empty payload', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ cashiers: [] });
    expect(await listStaff('v_test')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `cd backend/apps/pos && npx vitest run tests/api/staff.test.ts`
Expected: FAIL — current `listStaff` calls `/admin/staff?vendor_id=...` and returns `r.staff ?? r.rows ?? []` (wrong path; rows would lack `permission_overrides`).

- [ ] **Step 3: Re-point `staff.ts` `listStaff`**

Replace the contents of `backend/apps/pos/src/api/staff.ts` with:

```typescript
// listStaff reads the live cashier roster from the pos_terminal module.
// NOTE: GET /admin/pos-terminal/cashiers does NOT return permission_overrides or
// last_active_at — those aren't exposed by the cashier list. We default
// permission_overrides to {} so PinResetScreen.resolveLabel (which dereferences
// row.permission_overrides[key]) renders role-default pills without crashing.
// resetPin still targets /admin/staff/:id/reset-pin — that endpoint is built in
// Pass 2 (POST /admin/pos-terminal/cashiers/:id/reset-pin); the reset action
// 404s until then.

import { apiGet, apiPost } from './client';

export type StaffRow = {
  id: string;
  vendor_id: string;
  name: string;
  role: 'owner' | 'manager' | 'cashier' | 'data_entry' | 'picker';
  permission_overrides: Record<string, true | false>;
  last_active_at?: string | null;
};

type Cashier = {
  id: string;
  vendor_id: string;
  name: string;
  role: StaffRow['role'];
  active?: boolean;
  pin_hash_prefix?: string;
};

export async function listStaff(vendorId: string): Promise<StaffRow[]> {
  const r = await apiGet<{ cashiers?: Cashier[] }>(
    `/admin/pos-terminal/cashiers?vendor_id=${encodeURIComponent(vendorId)}`,
  );
  return (r.cashiers ?? []).map((c) => ({
    id: c.id,
    vendor_id: c.vendor_id,
    name: c.name,
    role: c.role,
    permission_overrides: {},
    last_active_at: null,
  }));
}

export async function resetPin(id: string, pin: string): Promise<{ ok: boolean }> {
  return apiPost(`/admin/staff/${encodeURIComponent(id)}/reset-pin`, { pin });
}
```

- [ ] **Step 4: Run the staff api test, confirm green**

Run: `cd backend/apps/pos && npx vitest run tests/api/staff.test.ts`
Expected: PASS — 3/3.

- [ ] **Step 5: Run the PinResetScreen unit test, confirm still green**

Run: `cd backend/apps/pos && npx vitest run tests/screens/manager/PinResetScreen.test.tsx`
Expected: PASS (it mocks the staff api client).

- [ ] **Step 6: Type-check**

Run: `cd backend/apps/pos && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/pos/src/api/staff.ts backend/apps/pos/tests/api/staff.test.ts
git commit -m "fix(pos/api): re-point listStaff to /admin/pos-terminal/cashiers (overrides default {})"
```

---

## Task 4: Full-suite regression + optional live verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full PoS test suite**

Run: `cd backend/apps/pos && npx vitest run`
Expected: all green — 198 prior + 10 new (5 departments + 2 catalog + 3 staff) = **208 passing**.

- [ ] **Step 2: Type-check the whole PoS app**

Run: `cd backend/apps/pos && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3 (OPTIONAL — live verification via Playwright):**

This satisfies the "re-verify live" half of the DoD. Requires the stack running:

```bash
# from repo root, start Postgres if not running:
& "D:\Programs\PostgreSQL\16\bin\pg_ctl.exe" start -D "d:\Personal\08_Ecommerce app\ecommerce-mvp\local-pg-data" -l "d:\Personal\08_Ecommerce app\ecommerce-mvp\local-pg.log" -w
# kill stale dev servers so Vite binds :9200 (CORS only allows :9200)
# then in two terminals:
cd backend/apps/backend && npm run dev      # :9000
cd backend/apps/pos     && npm run dev      # :9200
```

Then, with the Playwright MCP:
1. Navigate to `http://localhost:9200`, sign in, enter manager mode (QA Manager / PIN 4242, vendor `v_test`).
2. **Departments** — confirm the list renders real merch categories (or the empty state if `v_test` has none); add a department, rename it, drag to reorder; confirm no console 404s on `/admin/departments*` and that writes hit `/admin/tenants/v_test/merch-categories` + `/admin/departments/reorder`.
3. **Catalog rail** — confirm the department rail/chips populate from merch categories (product grid stays empty/placeholder — that's Pass 2).
4. **PIN reset** — confirm the staff list renders cashiers with role-default capability pills and no crash. (The reset action will 404 until Pass 2 — expected.)
5. Save screenshots to `docs/superpowers/h3-2d-smoke/<surface>.png`.

If live verification is deferred to the end-of-phase manual walk, the api-client tests from Tasks 1–3 are the binding DoD for this pass — note the deferral in the progress doc.

- [ ] **Step 4: Update the progress doc**

Append a Pass-1 status section to `docs/superpowers/plans/2026-05-28-phase-h3-2c-progress.md` (or create `docs/superpowers/plans/2026-05-30-phase-h3-2d-progress.md`) recording: 3 clients re-pointed, 10 api-client tests added, suite at 208, whether live verify was run or deferred, and that `resetPin` + products list remain for Pass 2.

---

## Self-review notes

- **Spec coverage:** Pass-1 scope table from the phase brief — Catalog+AddProduct rail (Task 2, `catalog.ts`), Departments list/create/update (Task 1) + reorder (already works, locked by test in Task 1), PIN reset staff list (Task 3). All covered. Products list and `resetPin` endpoint are explicitly Pass 2.
- **DoD:** every re-point has an api-client test asserting path + response→type mapping (the screen tests can't catch wrong URL/shape because they mock the clients), plus optional live Playwright verification in Task 4.
- **Type consistency:** `toDepartment`/inline mappers produce the exact `Department`/`StaffRow` shapes the screens already import; `updateDepartment` arity change has its single call site updated in the same task.
- **No UI/visual change** in this pass → no frontend-design gate required.
