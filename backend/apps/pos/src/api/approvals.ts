/**
 * approvals.ts — Approval-queue API client
 *
 * ARCHITECTURE NOTE (Phase H-3.2d Pass 3):
 * ─────────────────────────────────────────
 * The backend now has a real `pos_pending_refund` store with three routes:
 *
 *   GET  /admin/approvals/refunds?vendor_id=&status=
 *     → { approvals: RefundApproval[] }
 *
 *   POST /admin/approvals/refunds
 *     body: CreateRefundRequestInput
 *     → { approval: RefundApproval }
 *
 *   POST /admin/approvals/refunds/bulk
 *     body: { refunds: string[], decision: 'approve'|'decline', approver_id: string }
 *     → { processed: number; failed: string[] }
 *     The server resolves each approval ID to its stored record, executes the
 *     processReturn flow, and persists the decision. No client-side ID resolution needed.
 *
 * listPendingRefunds() still uses a defensive .catch(()=>[]) so a transient
 * network error renders an empty tray rather than crashing the manager screen.
 */

import { api, apiGet, apiPost } from './client';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RefundApproval = {
  id: string;
  vendor_id: string;
  /** Normalised client-side field — always populated by listPendingRefunds(). */
  sale_id: string;
  /** Raw column name returned by the backend pos_refund_request model. */
  original_sale_id: string;
  total_minor: number;
  reason: string;
  requested_by: string;
  requested_by_name?: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
};

export type CreateRefundRequestInput = {
  vendor_id: string;
  original_sale_id: string;
  total_minor: number;
  reason: string;
  requested_by: string;
  requested_by_name?: string | null;
  payload: unknown; // full ProcessReturnInput
};

// ─── API helpers ─────────────────────────────────────────────────────────────

/**
 * List pending refund-approvals for a vendor.
 * Defensive empty fallback: a transient network error returns [] instead of
 * crashing the manager screen — the real GET endpoint exists as of H-3.2d Pass 3.
 */
export function listPendingRefunds(vendorId: string): Promise<RefundApproval[]> {
  return apiGet<{ approvals?: RefundApproval[]; rows?: RefundApproval[] }>(
    `/admin/approvals/refunds?vendor_id=${encodeURIComponent(vendorId)}&status=pending`,
  )
    .then((r) => {
      const arr = r.approvals ?? r.rows ?? [];
      // The backend model column is `original_sale_id`; normalise to `sale_id`
      // so the tray's QueueCard / DetailPanel always has a non-undefined value.
      return arr.map((a) => ({ ...a, sale_id: a.sale_id ?? a.original_sale_id }));
    })
    .catch(() => []);
}

/**
 * Create a new refund-approval request.
 * POSTs to /admin/approvals/refunds and unwraps the created approval from {approval}.
 */
export async function createRefundRequest(input: CreateRefundRequestInput): Promise<RefundApproval> {
  const r = await apiPost<{ approval: RefundApproval }>('/admin/approvals/refunds', input);
  return r.approval;
}

/**
 * Bulk-approve refunds.
 * Body: { refunds: approvalIds, decision: 'approve', approver_id }.
 * The server resolves each ID to its stored record and executes the approval flow.
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
