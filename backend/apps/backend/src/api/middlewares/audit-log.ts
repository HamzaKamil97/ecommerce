import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from '@medusajs/framework/http';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Emits one platform_audit_log row per successful (2xx) mutating request.
 * Runs after the route handler. On non-2xx, no audit row is written.
 *
 * Captures actor from req.user (set by Medusa auth middleware) when available.
 * Captures vendor_id, in priority order:
 *   1. (req as any).audit_context.vendor_id  — opt-in, set by the route handler
 *      AFTER it has resolved the vendor (e.g. via a service lookup). Read at
 *      response-finish time, so handlers may set it any time before they call
 *      res.json/res.end.
 *   2. req.query.vendor_id
 *   3. req.body.vendor_id
 *   4. req.params.vendor_id
 *
 * The audit_context pattern exists for multi-step routes (cash-session/close,
 * inventory-count/:id PATCH + apply) whose request bodies do not carry
 * vendor_id but whose handlers know the vendor via a session lookup.
 */
export async function auditLogMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
): Promise<void> {
  if (!MUTATING_METHODS.has(req.method ?? '')) return next();

  // Capture body snapshot upfront — handlers may mutate req.body
  const path = req.path;
  const method = req.method;
  const module = path.split('/').filter(Boolean)[1] ?? 'unknown';  // /admin/<module>/...
  const action = method === 'DELETE' ? 'delete'
    : method === 'PATCH' || method === 'PUT' ? 'update'
    : 'create';
  const body_snapshot = req.body ? JSON.parse(JSON.stringify(req.body)) : null;

  // Resolve vendor_id at finish time so route handlers have a chance to set
  // (req as any).audit_context = { vendor_id } after a service lookup.
  const captureVendorId = (): string | null =>
    (req as any).audit_context?.vendor_id ??
    (req.query.vendor_id as string | undefined) ??
    (req.body as any)?.vendor_id ??
    (req.params as any)?.vendor_id ??
    null;

  // Hook into res.on('finish') to know status code without buffering body
  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    try {
      const auditSvc: any = req.scope.resolve('auditLogService');
      const user: any = (req as any).user;
      const actor_id = user?.id ?? user?.userId ?? null;
      const actor_type = actor_id ? 'user' : 'system';
      // Fire and forget — audit must never fail the user's request
      auditSvc.writeAudit({
        vendor_id: captureVendorId(),
        actor_id,
        actor_type,
        module,
        action,
        entity_id: (req.params as any)?.id ?? null,
        before_json: null,
        after_json: body_snapshot,
        metadata: { path, method, status: res.statusCode },
      }).catch(() => {});
    } catch {
      // Container resolve failures during shutdown — swallow
    }
  });

  return next();
}
