import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from '@medusajs/framework/http';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Emits one platform_audit_log row per successful (2xx) mutating request.
 * Runs after the route handler. On non-2xx, no audit row is written.
 *
 * Captures actor from req.user (set by Medusa auth middleware) when available.
 * Captures vendor_id from query/body/params in that order.
 */
export async function auditLogMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
): Promise<void> {
  if (!MUTATING_METHODS.has(req.method ?? '')) return next();

  // Capture identifying info upfront — body may be mutated by handlers
  const vendor_id =
    (req.query.vendor_id as string | undefined) ??
    (req.body as any)?.vendor_id ??
    (req.params as any)?.vendor_id ??
    null;
  const path = req.path;
  const method = req.method;
  const module = path.split('/').filter(Boolean)[1] ?? 'unknown';  // /admin/<module>/...
  const action = method === 'DELETE' ? 'delete'
    : method === 'PATCH' || method === 'PUT' ? 'update'
    : 'create';
  const body_snapshot = req.body ? JSON.parse(JSON.stringify(req.body)) : null;

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
        vendor_id,
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
