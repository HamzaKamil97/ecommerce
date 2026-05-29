/**
 * approvals.ts — Approval-queue API client
 *
 * ARCHITECTURE NOTE (Phase H-3.2c):
 * ─────────────────────────────────
 * The backend route POST /admin/approvals/refunds/bulk was shipped in task A3
 * as a STATELESS helper (path B of the processReturn flow). Its body shape is:
 *   { refunds: ProcessReturnInput[], decision: 'approve'|'decline', approver_id: string }
 *
 * There is NO `pos_pending_refund` store and NO GET /admin/approvals/refunds endpoint
 * yet. The ApprovalsTrayScreen in this phase is therefore a FORWARD-LOOKING UI SHELL
 * exercised only via mocks — the unit tests are the acceptance gate, not a live backend.
 *
 * listPendingRefunds() is fail-soft against the not-yet-built GET endpoint.
 *
 * bulkApproveRefunds / bulkDeclineRefunds take (approvalIds: string[], approverId: string).
 * We only have IDs in this phase, so we forward them under the `refunds` key with the
 * correct A3 key names. When the pending-approvals store lands, callers should resolve
 * each approval ID → its stored ProcessReturnInput before POSTing.
 */

import { api, apiGet, apiPost } from './client';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RefundApproval = {
  id: string;
  vendor_id: string;
  sale_id: string;
  total_minor: number;
  reason: string;
  requested_by: string;
  requested_by_name?: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
};

// ─── API helpers ─────────────────────────────────────────────────────────────

/**
 * List pending refund-approvals for a vendor.
 * Fail-soft: the GET endpoint does not exist yet — returns [] on any error.
 */
export function listPendingRefunds(vendorId: string): Promise<RefundApproval[]> {
  return apiGet<{ approvals?: RefundApproval[]; rows?: RefundApproval[] }>(
    `/admin/approvals/refunds?vendor_id=${encodeURIComponent(vendorId)}&status=pending`,
  )
    .then((r) => r.approvals ?? r.rows ?? [])
    .catch(() => []);
}

/**
 * Bulk-approve refunds.
 *
 * Body uses A3 keys: { refunds, decision, approver_id }.
 * NOTE: We only have IDs at this phase — forwarding them directly under `refunds`.
 * TODO: once the pending-approvals store exists, resolve each ID to its
 *       ProcessReturnInput before POSTing.
 */
export function bulkApproveRefunds(
  approvalIds: string[],
  approverId: string,
): Promise<{ processed: number; failed: string[] }> {
  return apiPost('/admin/approvals/refunds/bulk', {
    refunds: approvalIds,
    decision: 'approve',
    approver_id: approverId,
  });
}

/**
 * Bulk-decline refunds. Same body shape as bulkApproveRefunds, decision = 'decline'.
 */
export function bulkDeclineRefunds(
  approvalIds: string[],
  approverId: string,
): Promise<{ processed: number; failed: string[] }> {
  return apiPost('/admin/approvals/refunds/bulk', {
    refunds: approvalIds,
    decision: 'decline',
    approver_id: approverId,
  });
}

/**
 * Grant a capability override to a staff member (e.g. self-approve refunds).
 * Uses the base `api` helper via PUT because no apiPut helper exists.
 */
export function grantCapabilityOverride(cashierId: string, key: string): Promise<unknown> {
  return api(`/admin/staff/${cashierId}/capabilities`, {
    method: 'PUT',
    body: JSON.stringify({ key, value: true }),
  });
}
