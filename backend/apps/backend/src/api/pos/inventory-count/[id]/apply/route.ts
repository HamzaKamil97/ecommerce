import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('inventoryCountService');
  const id = (req.params as any).id;
  const body = (req.body ?? {}) as any;
  if (!body.actor_id) return res.status(400).json({ error: 'actor_id required' });
  // Look up session for vendor attribution. Without this the audit-log
  // middleware writes vendor_id=null since the request body carries only
  // actor_id (no vendor_id).
  const [rows] = await svc.listAndCountCountSessions({ id });
  if (rows.length) {
    (req as any).audit_context = { vendor_id: rows[0].vendor_id };
  }
  try {
    const session = await svc.applyCount({ session_id: id, actor_id: body.actor_id });
    res.json({ session });
  } catch (e: any) {
    // COUNT_APPLY_PARTIAL → 207 Multi-Status. The service surfaces the index
    // of the failed line plus the session_id so the operator/UI can resume
    // from the breakpoint. Earlier lines (0..applied_line_index-1) have been
    // committed to wms; the session stays in_progress so apply can be retried
    // once stock or data is corrected.
    if (e.code === 'COUNT_APPLY_PARTIAL') {
      return res.status(207).json({
        error: e?.message,
        code: e.code,
        applied_line_index: e.applied_line_index,
        session_id: e.session_id ?? id,
        failed_variant_id: e.failed_variant_id,
      });
    }
    const status = e.code === 'COUNT_NOT_FOUND' ? 404
      : e.code === 'COUNT_NOT_OPEN' ? 409
      : 500;
    res.status(status).json({ error: e?.message, code: e?.code });
  }
}
