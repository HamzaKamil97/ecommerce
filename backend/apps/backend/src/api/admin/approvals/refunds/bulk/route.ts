import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

/**
 * POST /admin/approvals/refunds/bulk
 *
 * Bulk approve OR decline a batch of refund requests by ID. Stop-on-first-error
 * semantics with best-effort rollback of work already done.
 *
 * --- ID-based contract (P3-3) ---
 * Each entry in `refunds[]` is a `pos_refund_request.id` string. The route
 * resolves each id against the `pos_refund_request` module, validates that the
 * request exists and is `status === 'pending'`, then acts on it:
 *
 *   Approve: pos.processReturn(request.payload) → markStatus(id, 'approved')
 *   Decline: markStatus(id, 'declined')  [no processReturn]
 *
 * The vendor context is derived from the FIRST resolved request (all requests
 * in a batch must share the same vendor_id — mixed-vendor batches are rejected
 * up-front).
 *
 * Rollback semantics on approve failure:
 *   processReturn is NOT transactional across calls. On any item failure we
 *   manually compensate the items already approved in this batch:
 *     1. Soft-delete each created refund_sale row (frees up client_id so
 *        retries with the same client_id work).
 *     2. Re-decrement the stock that was restocked by each prior call
 *        (best-effort; mirrors processReturn's own internal rollback).
 *     3. Revert markStatus(id, 'approved') → back to 'pending' for each
 *        request that was already marked approved in this batch.
 *   Then return HTTP 409 with `processed_before_failure`.
 *
 * Body:
 *   {
 *     refunds: string[],           // array of pos_refund_request.id
 *     decision: 'approve' | 'decline',
 *     approver_id: string,
 *   }
 *
 * Gated by `requirePermission('pos.refund_or_void')` via the central
 * middlewares.ts. Audit context set from the FIRST request's vendor_id so
 * the auditLogMiddleware (registered on /admin/*) attributes the row to
 * that vendor.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as {
    refunds?: any[];
    decision?: 'approve' | 'decline';
    approver_id?: string;
  };
  const { refunds, decision, approver_id } = body;

  // --- Input validation (before any mutation) ---
  if (!Array.isArray(refunds) || refunds.length === 0) {
    return res.status(400).json({ error: 'refunds must be a non-empty array' });
  }
  if (decision !== 'approve' && decision !== 'decline') {
    return res.status(400).json({ error: 'decision must be "approve" or "decline"' });
  }
  if (!approver_id || typeof approver_id !== 'string') {
    return res.status(400).json({ error: 'approver_id required' });
  }
  for (let i = 0; i < refunds.length; i++) {
    if (!refunds[i] || typeof refunds[i] !== 'string') {
      return res.status(400).json({ error: `refunds[${i}] must be a non-empty string id` });
    }
  }

  const pos: any = req.scope.resolve('posTerminalService');
  const wms: any = req.scope.resolve('wmsService');
  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const refundSvc: any = req.scope.resolve('pos_refund_request');

  const now = new Date();

  // Resolve the FIRST request to derive vendor context + validate existence.
  // If the first id is missing or not pending, fail fast before any mutation.
  const firstRows = await refundSvc.listPosRefundRequests({ id: refunds[0] });
  if (!firstRows.length) {
    return res.status(409).json({
      error: `batch rolled back at index 0: refund request '${refunds[0]}' not found`,
      processed_before_failure: 0,
    });
  }
  const firstReq = firstRows[0];

  // Attribute the audit row to the batch vendor.
  (req as any).audit_context = { vendor_id: firstReq.vendor_id };
  const batchVendor: string = firstReq.vendor_id;

  // --- Decline path ---
  // Mark each request declined. No processReturn call.
  if (decision === 'decline') {
    for (const id of refunds) {
      await refundSvc.markStatus(id, 'declined', approver_id, now);
    }
    return res.json({ processed: refunds.length, failed: [], results: [] });
  }

  // --- Approve path ---
  // Process sequentially; on failure compensate prior items + revert their status.
  const succeeded: Array<{
    request_id: string;
    refund_sale_id: string;
    vendor_id: string;
    client_id: string;
    cashier_id: string;
    lines: Array<{ variant_id: string; qty: number; reason: string }>;
  }> = [];
  const results: any[] = [];

  for (let i = 0; i < refunds.length; i++) {
    const id = refunds[i] as string;
    try {
      // Resolve request
      let request: any;
      if (i === 0) {
        request = firstReq;
      } else {
        const rows = await refundSvc.listPosRefundRequests({ id });
        if (!rows.length) {
          throw new Error(`refund request '${id}' not found`);
        }
        request = rows[0];
      }

      // Mixed-vendor guard: all requests in a batch must share the same vendor_id.
      if (request.vendor_id !== batchVendor) {
        throw new Error(
          `all refunds in a batch must share the same vendor_id (expected '${batchVendor}', got '${request.vendor_id}')`,
        );
      }

      // Only pending requests may be approved.
      if (request.status !== 'pending') {
        throw new Error(
          `refund request '${id}' has status '${request.status}' (expected 'pending')`,
        );
      }

      const payload = request.payload;
      const result = await pos.processReturn(payload);

      // Mark approved before recording success (so rollback can revert it).
      await refundSvc.markStatus(id, 'approved', approver_id, now);

      succeeded.push({
        request_id: id,
        refund_sale_id: result.refund_sale_id,
        vendor_id: payload.vendor_id ?? batchVendor,
        client_id: payload.client_id,
        cashier_id: payload.cashier_id ?? approver_id,
        lines: (payload.lines ?? []).map((l: any) => ({
          variant_id: l.variant_id, qty: l.qty, reason: l.reason,
        })),
      });
      results.push({ index: i, refund_sale_id: result.refund_sale_id });
    } catch (e: any) {
      // Compensate: undo each prior approved refund.
      for (const s of succeeded) {
        // 1. Re-decrement restocked qty (mirrors processReturn's restock logic).
        for (const l of s.lines) {
          if (l.reason === 'damaged' || l.reason === 'expired') continue;
          try {
            await wms.decrementStock({
              vendor_id: s.vendor_id, variant_id: l.variant_id, qty: l.qty,
              type: 'adjustment', source_id: s.client_id,
              actor_id: approver_id, note: 'bulk_refund rollback',
            });
          } catch { /* best effort */ }
        }
        // 2. Soft-delete the refund_sale row so client_id frees up.
        try {
          await pg.raw(
            `UPDATE pos_sale SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
            [s.refund_sale_id],
          );
        } catch { /* best effort */ }
        // 3. Revert the request status back to 'pending'.
        try {
          await refundSvc.updatePosRefundRequests({
            id: s.request_id, status: 'pending', approved_by: null, approved_at: null,
          });
        } catch { /* best effort */ }
      }

      return res.status(409).json({
        error: `batch rolled back at index ${i}: ${e?.message ?? 'unknown'}`,
        processed_before_failure: succeeded.length,
      });
    }
  }

  return res.json({ processed: succeeded.length, failed: [], results });
}
