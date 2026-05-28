import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

/**
 * POST /admin/approvals/refunds/bulk
 *
 * Bulk approve OR decline a batch of refund requests. Stop-on-first-error
 * semantics with best-effort rollback of work already done.
 *
 * --- PATH B (inline payloads) ---
 * The plan offered two paths:
 *   A) consume a pre-existing `pos_pending_refund` table
 *   B) accept the original sale-side payload directly per refund
 *
 * After grepping `backend/apps/backend/src/modules/pos_terminal/service.ts`
 * and the models/ directory we found:
 *   - NO `PendingRefund`, `RefundRequest`, `createPendingRefund`, or
 *     `retrievePendingRefund` method exists.
 *   - The only refund-side API is `processReturn(input: ProcessReturnInput)`
 *     which creates an immediate voided `pos_sale` row + restocks via wms.
 *   - Models present: cashier.model, sale.model, sale-line.model.
 *
 * Therefore we take PATH B. Each item in `refunds[]` is a full
 * `ProcessReturnInput` payload. "Approve" → call `processReturn` per item.
 * "Decline" → no-op (there is no pending record to mark declined; the UI
 * surface will simply not invoke processReturn for the staff request, which
 * is the cancel/discard semantic).
 *
 * Rollback semantics:
 *   `processReturn` is NOT transactional across calls (it uses the module's
 *   own pg connection internally for an idempotency check + has its own
 *   compensation chain for partial failures within a single call). Wrapping
 *   the loop in `pg.transaction(...)` would NOT bind those internal writes
 *   to the trx. So on any item failure we manually compensate the items
 *   already approved in this batch:
 *     1. Soft-delete each created refund_sale row (frees up client_id so
 *        retries with the same client_id work).
 *     2. Re-decrement the stock that was restocked by each prior call
 *        (best-effort; mirrors processReturn's own internal rollback).
 *   Then return HTTP 409 with `processed_before_failure`.
 *
 * Body:
 *   {
 *     refunds: ProcessReturnInput[],
 *     decision: 'approve' | 'decline',
 *     approver_id: string,
 *   }
 *
 * Gated by `requirePermission('pos.refund_or_void')` via the central
 * middlewares.ts. Audit context set from the FIRST refund's vendor_id so
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

  if (!Array.isArray(refunds) || refunds.length === 0) {
    return res.status(400).json({ error: 'refunds must be a non-empty array' });
  }
  if (decision !== 'approve' && decision !== 'decline') {
    return res.status(400).json({ error: 'decision must be "approve" or "decline"' });
  }
  if (!approver_id || typeof approver_id !== 'string') {
    return res.status(400).json({ error: 'approver_id required' });
  }

  const pos: any = req.scope.resolve('posTerminalService');
  const wms: any = req.scope.resolve('wmsService');
  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);

  // Attribute the audit row to the first refund's vendor_id (all items in
  // one batch should belong to the same vendor in practice).
  const firstVendor = refunds[0]?.vendor_id;
  if (firstVendor) {
    (req as any).audit_context = { vendor_id: firstVendor };
  }

  // Decline = no-op for Path B (no pending record exists to mark declined).
  // We still return processed: refunds.length so the caller can display
  // "N declined" in the UI.
  if (decision === 'decline') {
    return res.json({ processed: refunds.length, failed: [], results: [] });
  }

  // Approve path — process sequentially, compensate prior items on failure.
  const succeeded: Array<{
    refund_sale_id: string;
    vendor_id: string;
    client_id: string;
    cashier_id: string;
    lines: Array<{ variant_id: string; qty: number; reason: string }>;
  }> = [];
  const results: any[] = [];

  for (let i = 0; i < refunds.length; i++) {
    const payload = refunds[i];
    try {
      const result = await pos.processReturn(payload);
      succeeded.push({
        refund_sale_id: result.refund_sale_id,
        vendor_id: payload.vendor_id,
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
      }

      return res.status(409).json({
        error: `batch rolled back at index ${i}: ${e?.message ?? 'unknown'}`,
        processed_before_failure: succeeded.length,
      });
    }
  }

  return res.json({ processed: succeeded.length, failed: [], results });
}
