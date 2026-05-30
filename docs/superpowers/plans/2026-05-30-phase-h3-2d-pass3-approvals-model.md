# Phase H-3.2d Pass 3 — Approvals model (Option A: pending refund-request store) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the manager **Approvals tray** functional end-to-end by adding a real pending-refund-request store, so a refund that needs manager approval becomes a queued request the manager approves/declines (executing the actual refund on approve).

**Decision (locked):** **Option A** — add a `pos_refund_request` table + service (proper workflow). NOT Option B. The ApprovalsTrayScreen is already a complete UI shell (`backend/apps/pos/src/ui/screens/manager/ApprovalsTrayScreen.tsx`) that renders `RefundApproval` cards from `listPendingRefunds` and calls approve/decline by ID — **so this is BACKEND + client-wiring only, NO new UI, NO design gate.**

**Scope boundary (IMPORTANT):** This pass builds the store + create/list endpoints + rewrites the bulk-approve route to resolve IDs + wires the manager tray to real data. It also adds a `createRefundRequest` CLIENT helper + `POST` create endpoint so requests can be created/seeded. It **DEFERS** wiring the *cashier* refund flow (`RefundFlowPhone`/`RefundScreen`) to call `createRefundRequest` when a refund escalates — that adds a new "sent for approval" state to the cashier surface = a new UI surface = the [[feedback_design_first_gate]] applies. Flag it for a future design-gated step; do NOT build it here.

**Architecture:** New Medusa module `pos_refund_request` (mirrors `merch`/`pos_tag` scaffold). It stores the full `ProcessReturnInput` payload as JSONB plus request metadata + status. The rewritten `POST /admin/approvals/refunds/bulk` resolves each approval ID → its stored payload → `posTerminalService.processReturn(payload)` on approve (marking status `approved`), or marks `declined` on decline. The existing per-call compensation/rollback semantics of the bulk route are preserved.

**Tech Stack:** Medusa v2, MedusaService auto-CRUD, JSONB column for the payload, Jest HTTP integration tests (one-at-a-time), Vitest for client, Playwright for live verify.

**Branch:** continue on `phase-h3-2c-manager-surfaces` (HEAD `743088d`). One commit per task.

---

## Conventions (same as Pass 1/2 — do not deviate)
- HTTP integration tests ONE AT A TIME: `cd backend/apps/backend && TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit "<one spec>"`.
- Reuse `bootstrapAdmin` from `integration-tests/http/admin-merch.spec.ts` (copy into each new spec).
- `req.audit_context = { vendor_id }` BEFORE any mutation.
- Module scaffold mirrors `src/modules/merch` (model/service/index) + `src/modules/pos_tag` (recent example incl. migration via `npx medusa db:generate <module> && npx medusa db:migrate`).
- **MedusaService update MUST use the object form** `updateXxx({ id, ...fields })` — never positional id (that bug was fixed twice already this phase).
- After editing a pos `src/api/*.ts`, `rm -f` its `.js` shadow; the controller restarts the pos Vite dev server before live verify (stale `.js` shadow breaks HMR).
- Service keys: `posTerminalService`, `wmsService`, new module `pos_refund_request`.
- Vitest: `vi.fn`/`vi.mock`, `fireEvent`.

---

## Task P3-1: `pos_refund_request` module (table + service + migration)

**Files:**
- Create: `backend/apps/backend/src/modules/pos_refund_request/models/pos-refund-request.ts`
- Create: `backend/apps/backend/src/modules/pos_refund_request/service.ts`
- Create: `backend/apps/backend/src/modules/pos_refund_request/index.ts`
- Create (generated): `backend/apps/backend/src/modules/pos_refund_request/migrations/*.ts`
- Modify: `backend/apps/backend/medusa-config.ts`
- Create: `backend/apps/backend/src/modules/pos_refund_request/__tests__/pos-refund-request.spec.ts`

- [ ] **Step 1 — Model** (`pos-refund-request.ts`). The `payload` JSONB stores the full `ProcessReturnInput` (shape in `src/modules/pos_terminal/types.ts`: vendor_id, cashier_id, manager_id, terminal_id, original_sale_id, lines[], method, client_id). Mirror `pos_tag` model style:
```ts
import { model } from '@medusajs/framework/utils'
export const PosRefundRequest = model.define('pos_refund_request', {
  id: model.id().primaryKey(),
  vendor_id: model.text(),
  original_sale_id: model.text(),
  total_minor: model.number(),
  reason: model.text(),
  requested_by: model.text(),               // cashier id
  requested_by_name: model.text().nullable(),
  status: model.text().default('pending'),  // pending | approved | declined
  payload: model.json(),                    // full ProcessReturnInput for processReturn
  approved_by: model.text().nullable(),
  approved_at: model.dateTime().nullable(),
}).indexes([{ on: ['vendor_id', 'status'] }, { on: ['vendor_id'] }])
```

- [ ] **Step 2 — Service** (`service.ts`):
```ts
import { MedusaService } from '@medusajs/framework/utils'
import { PosRefundRequest } from './models/pos-refund-request'
class PosRefundRequestService extends MedusaService({ PosRefundRequest }) {
  async createRequest(input: {
    vendor_id: string; original_sale_id: string; total_minor: number; reason: string;
    requested_by: string; requested_by_name?: string | null; payload: any;
  }) {
    return this.createPosRefundRequests({ ...input, status: 'pending' })
  }
  async listForVendor(vendor_id: string, status?: string) {
    const where: any = { vendor_id }
    if (status) where.status = status
    return this.listPosRefundRequests(where, { order: { created_at: 'ASC' } })
  }
  async markStatus(id: string, status: 'approved' | 'declined', approver_id: string, approved_at: Date) {
    return this.updatePosRefundRequests({ id, status, approved_by: approver_id, approved_at })
  }
}
export default PosRefundRequestService
```
(Note: `approved_at` is passed in by the route — do NOT call `new Date()` in the service if your test runner forbids it; the route supplies it.)

- [ ] **Step 3 — index.ts**: `export const POS_REFUND_REQUEST_MODULE = 'pos_refund_request'; export default Module(POS_REFUND_REQUEST_MODULE, { service: PosRefundRequestService })`.

- [ ] **Step 4 — Register** in `medusa-config.ts` modules array: `{ resolve: "./src/modules/pos_refund_request" },`.

- [ ] **Step 5 — Generate + migrate:** `cd backend/apps/backend && npx medusa db:generate pos_refund_request && npx medusa db:migrate`. Confirm the migration file + table. PASTE output.

- [ ] **Step 6 — Module test** (`__tests__/pos-refund-request.spec.ts`, use `moduleIntegrationTestRunner` — mirror `src/modules/merch/__tests__/merch.spec.ts`): createRequest → listForVendor('v', 'pending') returns it; markStatus('approved', ...) → status updated + listForVendor('v','pending') excludes it. Run: `cd backend/apps/backend && TEST_TYPE=integration:modules NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit "src/modules/pos_refund_request/__tests__/pos-refund-request.spec.ts"` (confirm the exact module-test command against an existing module test's npm script / how merch.spec is run).

- [ ] **Step 7 — Commit:** `feat(refunds): pos_refund_request module (pending refund-request store)`.

---

## Task P3-2: create + list routes for refund requests

**Files:**
- Create: `backend/apps/backend/src/api/admin/approvals/refunds/route.ts` (GET list + POST create)
- Modify: `backend/apps/backend/src/api/middlewares.ts`
- Create: `backend/apps/backend/integration-tests/http/admin-approvals-refunds.spec.ts`

- [ ] **Step 1 — Failing HTTP test** (`admin-approvals-refunds.spec.ts`, copy `bootstrapAdmin`):
```ts
it('creates a pending refund request and lists it', async () => {
  const create = await api.post('/admin/approvals/refunds', {
    vendor_id: 'v_ar', original_sale_id: 'sale_1', total_minor: 3000, reason: 'damaged',
    requested_by: 'csh_1', requested_by_name: 'Hala',
    payload: { vendor_id: 'v_ar', cashier_id: 'csh_1', manager_id: '', terminal_id: 't1',
      original_sale_id: 'sale_1', method: 'cash', client_id: 'cl_1',
      lines: [{ original_sale_line_id: 'l1', variant_id: 'v1', qty: 1, unit_price_minor: 3000, reason: 'damaged' }] },
  }, { headers: adminHeaders }).catch((e:any)=>e.response)
  expect(create.status).toBe(201)
  expect(create.data.approval.status).toBe('pending')

  const list = await api.get('/admin/approvals/refunds?vendor_id=v_ar&status=pending', { headers: adminHeaders })
  expect(list.status).toBe(200)
  const a = list.data.approvals.find((x:any)=>x.id===create.data.approval.id)
  expect(a).toMatchObject({ original_sale_id: 'sale_1', total_minor: 3000, reason: 'damaged', requested_by: 'csh_1', status: 'pending' })
})
it('400 when vendor_id missing on list', async () => {
  const r = await api.get('/admin/approvals/refunds').catch((e:any)=>e.response)
  expect(r.status).toBe(400)
})
```

- [ ] **Step 2 — confirm fails.**

- [ ] **Step 3 — Implement route** (`approvals/refunds/route.ts`):
```ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { POS_REFUND_REQUEST_MODULE } from '../../../../modules/pos_refund_request'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' })
  const status = req.query.status as string | undefined
  const svc: any = req.scope.resolve(POS_REFUND_REQUEST_MODULE)
  res.json({ approvals: await svc.listForVendor(vendor_id, status) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body ?? {}) as any
  for (const k of ['vendor_id','original_sale_id','total_minor','reason','requested_by','payload']) {
    if (b[k] == null) return res.status(400).json({ error: `${k} required` })
  }
  ;(req as any).audit_context = { vendor_id: b.vendor_id }
  const svc: any = req.scope.resolve(POS_REFUND_REQUEST_MODULE)
  const approval = await svc.createRequest({
    vendor_id: b.vendor_id, original_sale_id: b.original_sale_id, total_minor: Number(b.total_minor),
    reason: b.reason, requested_by: b.requested_by, requested_by_name: b.requested_by_name ?? null,
    payload: b.payload,
  })
  res.status(201).json({ approval })
}
```
NOTE: `createPosRefundRequests` may return an array — if so, return `approval[0]`. Match whatever the service returns (mirror how `pos_tag` POST returns a single object).

- [ ] **Step 4 — Gate** in `middlewares.ts`. GET (manager views the queue) → `requirePermission('pos.refund_or_void')`. POST create (a refund-request submission) → `requirePermission('pos.return_process')`. FIRST grep `src/permissions/capabilities.ts` to confirm both keys exist; confirm `pos.refund_or_void` is manager-granted (it is — manager role default) and pick the correct cap the *requester* has for POST (if `pos.return_process` resolves to `'pin'`/false for the intended caller and that blocks it, gate POST on the same `pos.refund_or_void` for now and note it — the dev admin/manager token used in tests has it). State which caps you used.
```ts
{ matcher: '/admin/approvals/refunds', method: ['GET'], middlewares: [requirePermission('pos.refund_or_void')] },
{ matcher: '/admin/approvals/refunds', method: ['POST'], middlewares: [requirePermission('pos.return_process')] },
```

- [ ] **Step 5 — test green; Step 6 — commit:** `feat(api): GET/POST /admin/approvals/refunds (pending refund-request queue)`.

---

## Task P3-3: rewrite `POST /admin/approvals/refunds/bulk` to resolve approval IDs

**Files:**
- Modify: `backend/apps/backend/src/api/admin/approvals/refunds/bulk/route.ts`
- Modify: `backend/apps/backend/integration-tests/http/admin-approvals-refunds-bulk.spec.ts` (update the A3 test to the new ID contract)

Background: the route currently takes `{ refunds: ProcessReturnInput[], decision, approver_id }` (inline payloads). The PoS client (`approvals.ts`) actually sends `{ refunds: <approvalId[]>, decision, approver_id }`. Switch the route to the ID contract: each `refunds[]` entry is a `pos_refund_request.id`. Approve → load the request, `processReturn(request.payload)`, `markStatus('approved')`. Decline → `markStatus('declined')` (no processReturn). Preserve the compensation/rollback on a mid-batch failure (soft-delete created refund_sale rows + re-decrement restocked stock) AND additionally revert any `markStatus('approved')` done earlier in the batch back to `pending`.

- [ ] **Step 1 — Update the HTTP test** `admin-approvals-refunds-bulk.spec.ts`: instead of inline ProcessReturnInput payloads, the test now (a) records a real sale via `posTerminalService.recordSale(...)` to get a `sale_id` + line ids, (b) creates a `pos_refund_request` (via the module service or the P3-2 POST) whose `payload` is a valid `ProcessReturnInput` against that sale, (c) POSTs `/admin/approvals/refunds/bulk` `{ refunds: [approvalId], decision: 'approve', approver_id: 'owner' }` → 200 `processed:1`; asserts the request status is now `approved` and a refund_sale was created (or stock changed). Add a decline case: `{refunds:[id2], decision:'decline'}` → request status `declined`, NO refund executed. Keep an empty-array 400 case. (Read the existing A3 test + `processReturn` to build a valid sale+payload; reuse helpers already in the repo if present.)

- [ ] **Step 2 — confirm the old test fails** against the new contract (it sends the old shape).

- [ ] **Step 3 — Implement.** Rewrite the handler: validate `refunds` is a non-empty array of strings (ids), `decision`, `approver_id`. Resolve the FIRST request to set `audit_context.vendor_id`. For decline: `for (id of refunds) markStatus(id,'declined',approver, now)` → return `{ processed: refunds.length }`. For approve: loop — load request (404/skip semantics: if a request id is missing or already non-pending, treat as a batch error → 409 rollback), `processReturn(request.payload)`, `markStatus(id,'approved',approver, now)`, track succeeded for compensation. On failure mid-batch: compensate created refund_sale rows + re-decrement stock (existing logic) AND revert the markStatus('approved') of succeeded items to 'pending'; return 409 with `processed_before_failure`. The `now: Date` must be created in the route (routes may use `new Date()`), not the service.

- [ ] **Step 4 — test green; Step 5 — commit:** `feat(api): bulk refund-approve resolves pos_refund_request ids + executes processReturn`.

---

## Task P3-4: wire client + verify manager tray

**Files:**
- Modify: `backend/apps/pos/src/api/approvals.ts`
- Create: `backend/apps/pos/tests/api/approvals.test.ts`

- [ ] **Step 1 — Client.** In `approvals.ts`:
  - `listPendingRefunds` already GETs `/admin/approvals/refunds?vendor_id=&status=pending` and unwraps `{approvals}` — keep it but it is no longer fail-soft-only; leave the `.catch(()=>[])` (a network blip should still render an empty tray, not crash).
  - `bulkApproveRefunds(ids, approverId)` / `bulkDeclineRefunds` already POST `{ refunds: ids, decision, approver_id }` — now correct against the rewritten route. Update the stale architecture comment + the per-fn TODOs (the pending store now exists; IDs are resolved server-side).
  - ADD `createRefundRequest(input)` → `apiPost('/admin/approvals/refunds', input)` returning `{ approval }` unwrapped (for seeding + the future cashier flow). Type the input with the request fields.
  - Delete stale `approvals.js` shadow if present.

- [ ] **Step 2 — api-client test** `approvals.test.ts`: mock `./client`; assert `listPendingRefunds('v')` GETs the right path + unwraps `{approvals}`; `bulkApproveRefunds(['a1','a2'],'owner')` POSTs `/admin/approvals/refunds/bulk` with `{refunds:['a1','a2'],decision:'approve',approver_id:'owner'}`; `bulkDeclineRefunds` likewise with `decision:'decline'`; `createRefundRequest({...})` POSTs `/admin/approvals/refunds`.

- [ ] **Step 3 — Run** `cd backend/apps/pos && npx vitest run tests/api/approvals.test.ts tests/screens/manager/ApprovalsTrayScreen.test.tsx && npx tsc --noEmit` → green.

- [ ] **Step 4 — Commit:** `feat(pos): wire approvals client to real pending-refund queue + createRefundRequest`.

---

## Acceptance (controller-run after P3-1…P3-4)
- pos vitest full suite green + tsc 0; all new backend suites green individually + regression spot-check (admin-approvals-refunds-bulk, permission-middleware).
- **Live verify (manager tray):** seed a real sale + a pending refund request via the API for `v_test`; open the manager Approvals tray → the request appears as a queue card; open detail → Approve → `processReturn` executes (request → `approved`, refund recorded, stock restocked), card disappears; seed another → Decline → request `declined`, no refund. Verify the grant-override CTA still works. Screenshots to `docs/superpowers/h3-2d-smoke/approvals-*.png`.
- Update progress doc + memory.

## Deferred (flag to user — needs the design gate)
Wiring the **cashier** refund flow (`RefundFlowPhone`/`RefundScreen`) to call `createRefundRequest` when the cashier can't self-approve, plus the "refund request sent for approval" state on that surface. This is a new cashier-facing UI state → [[feedback_design_first_gate]]. Do it as a separate design-gated step after Pass 4.
