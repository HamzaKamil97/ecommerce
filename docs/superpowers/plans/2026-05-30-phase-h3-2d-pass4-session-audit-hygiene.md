# Phase H-3.2d Pass 4 — Session + audit hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** (1) Persist PoS sessions so a page reload no longer logs the user out — cashier → `localStorage`, manager → `sessionStorage` (security: back-office access must NOT survive a browser restart without re-PIN). (2) Stop the audit log from storing raw PINs.

**No design gate:** session persistence is invisible (no new UI); the audit change is backend-only.

**Branch:** continue on `phase-h3-2c-manager-surfaces` (HEAD `19127a0`). One commit per task.

**Why now:** the in-memory sessions force a full re-login on every page reload (hit repeatedly during live testing). And the audit middleware currently writes plaintext `pin` into `platform_audit_log.after_json` on cashier-create + reset-pin (flagged in P2-4).

---

## Conventions
- pos tests: Vitest, `vi.fn`/`vi.mock`, `fireEvent`. Test setup at `backend/apps/pos/tests/setup.ts` has a `localStorage` polyfill (used by `theme.ts` persist tests) — check whether `sessionStorage` is also polyfilled; if not, add an equivalent memory polyfill there.
- backend HTTP tests ONE AT A TIME: `cd backend/apps/backend && TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit "<one spec>"`.
- The zustand-persist reference is `backend/apps/pos/src/state/theme.ts` (persist + createJSONStorage + partialize). Mirror it exactly.

---

## Task P4-1: persist cashier (localStorage) + manager (sessionStorage) sessions

**Files:**
- Modify: `backend/apps/pos/src/state/session.ts`
- Modify: `backend/apps/pos/src/state/manager-session.ts`
- Modify (if needed): `backend/apps/pos/tests/setup.ts` (sessionStorage polyfill)
- Create: `backend/apps/pos/tests/session-persist.test.ts`

Background: `useSession` (cashier) and `useManagerSession` (manager) are plain zustand `create(...)` stores with no persistence (see current files). Reference the persist pattern in `state/theme.ts`.

- [ ] **Step 1 — Persist cashier session to localStorage.** Wrap `useSession` in `persist(...)` mirroring `theme.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
// ... Session type unchanged ...
export const useSession = create<Session>()(
  persist(
    (set) => ({
      cashier_id: null, cashier_name: null, role: null,
      signIn({ cashier_id, cashier_name, role }) { set({ cashier_id, cashier_name, role }); },
      signOut() { set({ cashier_id: null, cashier_name: null, role: null }); },
    }),
    {
      name: 'hanoot.session',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ cashier_id: s.cashier_id, cashier_name: s.cashier_name, role: s.role }),
    },
  ),
);
```

- [ ] **Step 2 — Persist manager session to sessionStorage** (NOT localStorage — a manager's back-office access must not survive a browser restart without re-entering the PIN). Same shape but `createJSONStorage(() => sessionStorage)` and `name: 'hanoot.manager-session'`, partialize `manager_id`/`manager_name`.

- [ ] **Step 3 — sessionStorage polyfill for tests.** Open `backend/apps/pos/tests/setup.ts`. If it polyfills `localStorage` but not `sessionStorage`, add an equivalent in-memory `sessionStorage` (jsdom may provide one — verify; if jsdom's is sufficient, skip). The manager-session persist must not throw in the test environment.

- [ ] **Step 4 — Cross-test leakage guard.** Persisted stores rehydrate from storage on import, so one test's sign-in can leak into another. In `tests/setup.ts` (or a shared beforeEach), ensure BOTH stores + their storage are reset between tests: `localStorage.clear(); sessionStorage.clear();` and reset each store to signed-out (`useSession.setState({cashier_id:null,...})`, same for manager) in a global `afterEach`/`beforeEach`. Verify the existing `LoginScreen` / `ManagerPinGate` / `RegisterScreen` / `manager-pin` tests still pass (they construct sessions; leakage would cross-contaminate them). Run the full suite at the end of this task to confirm no regression.

- [ ] **Step 5 — Persist round-trip test** `tests/session-persist.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useSession } from '../src/state/session';
import { useManagerSession } from '../src/state/manager-session';

beforeEach(() => { localStorage.clear(); sessionStorage.clear();
  useSession.setState({ cashier_id: null, cashier_name: null, role: null });
  useManagerSession.setState({ manager_id: null, manager_name: null }); });

it('persists cashier session to localStorage', () => {
  useSession.getState().signIn({ cashier_id: 'c1', cashier_name: 'Hala', role: 'cashier' });
  expect(localStorage.getItem('hanoot.session')).toContain('c1');
});
it('persists manager session to sessionStorage NOT localStorage', () => {
  useManagerSession.getState().signIn({ manager_id: 'm1', manager_name: 'QA' });
  expect(sessionStorage.getItem('hanoot.manager-session')).toContain('m1');
  expect(localStorage.getItem('hanoot.manager-session')).toBeNull();
});
it('signOut clears persisted cashier session', () => {
  useSession.getState().signIn({ cashier_id: 'c1', cashier_name: 'Hala', role: 'cashier' });
  useSession.getState().signOut();
  expect(useSession.getState().cashier_id).toBeNull();
  expect(localStorage.getItem('hanoot.session') ?? '').not.toContain('c1');
});
```

- [ ] **Step 6 — Run** `cd backend/apps/pos && npx vitest run tests/session-persist.test.ts` → green, THEN the full suite `npx vitest run` + `npx tsc --noEmit` → all green / 0 (catch any cross-test leakage regression).

- [ ] **Step 7 — Commit:** `feat(pos): persist cashier session (localStorage) + manager session (sessionStorage)`.

---

## Task P4-2: strip raw PIN + sensitive keys from audit_log after_json

**Files:**
- Modify: `backend/apps/backend/src/api/middlewares/audit-log.ts`
- Create: `backend/apps/backend/integration-tests/http/audit-log-pin-redaction.spec.ts`

Background: `audit-log.ts` line 37 does `body_snapshot = JSON.parse(JSON.stringify(req.body))` and writes it to `after_json` (line 65). For `POST /admin/pos-terminal/cashiers` (create) and `POST /admin/pos-terminal/cashiers/:id/reset-pin`, `req.body` contains a plaintext `pin` → it lands in the audit table. Strip sensitive keys from the snapshot.

- [ ] **Step 1 — Add a recursive redactor + apply it.** In `audit-log.ts`, add above the middleware:
```ts
const SENSITIVE_KEYS = new Set(['pin', 'new_pin', 'old_pin', 'password', 'pin_hash', 'pin_salt', 'secret', 'token']);
function redactSensitive(value: any): any {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : redactSensitive(v);
    }
    return out;
  }
  return value;
}
```
Then change line 37 to: `const body_snapshot = req.body ? redactSensitive(JSON.parse(JSON.stringify(req.body))) : null;`

- [ ] **Step 2 — Failing HTTP test** `audit-log-pin-redaction.spec.ts` (copy `bootstrapAdmin`):
```ts
it('does not store the raw pin in the audit after_json (cashier create)', async () => {
  const create = await api.post('/admin/pos-terminal/cashiers',
    { vendor_id: 'v_audit_pin', name: 'Redact', pin: '7777', role: 'cashier' },
    { headers: adminHeaders });
  expect(create.status).toBe(200);
  // read the audit log for this vendor
  const log = await api.get('/admin/audit-log?vendor_id=v_audit_pin', { headers: adminHeaders });
  const rows = log.data.rows ?? log.data.entries ?? [];
  const createRow = rows.find((r: any) => r.module === 'pos-terminal' || r.action === 'create');
  expect(createRow).toBeTruthy();
  const json = JSON.stringify(createRow.after_json ?? {});
  expect(json).not.toContain('7777');
  expect(json).toContain('[REDACTED]');
});
```
(Confirm the audit-log read route's response key — `rows` vs `entries` — against `src/api/admin/audit-log/route.ts`; adjust the test. Confirm the `module` value the middleware derives for `/admin/pos-terminal/...` — it's `path.split('/').filter(Boolean)[1]` = `'pos-terminal'`.)

- [ ] **Step 3 — confirm the test FAILS before the redactor** (temporarily, to prove it catches the leak) — or reason it through: pre-change, after_json contains `"pin":"7777"`. Then with the redactor, run green.

- [ ] **Step 4 — Run** the spec one-at-a-time → green. Also run `admin-audit-log.spec.ts` + `admin-cashier-reset-pin.spec.ts` individually to confirm no regression (redaction must not break the existing audit shape; non-sensitive fields like `name`/`vendor_id` must still be present in after_json).

- [ ] **Step 5 — Commit:** `fix(audit): redact pin/sensitive keys from audit_log after_json`.

---

## Acceptance (controller-run)
- pos vitest full suite green + tsc 0 (with the new persist + leakage guards).
- backend: the 2 new/touched suites green individually + `admin-audit-log` + `permission-middleware` regression.
- **Live verify (the payoff):** with the stack up, log in to the pos as cashier → manager; **reload the page (F5 / hard nav)** → confirm the cashier stays logged in (no re-login) and manager mode requires only the in-tab session (survives reload). Confirm a fresh browser context (new session) does NOT auto-enter manager mode. Then create a cashier via API + check `/admin/audit-log` shows `[REDACTED]` not the pin.
- Update progress doc + memory.

## After Pass 4 (whole H-3.2d phase)
Manual browser walk of all manager surfaces, then **superpowers:finishing-a-development-branch** to merge H-3.2c+d into main. Then offer the user the [[project_register_feature_gaps_2026-05-30]] follow-up (register catalog wiring, /pos/alerts, add-product photo) + the deferred cashier-initiates-refund-request UI (design-gated).
