import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { MERCH_MODULE } from '../../../../modules/merch';

type OrderItem = { id: string; position: number };

/**
 * PUT /admin/departments/reorder
 *
 * Atomic position update for a tenant's merch_category rows ("departments"
 * in the manager UI). Wraps every UPDATE in a single pg transaction so a
 * mid-batch failure leaves no half-applied ordering.
 *
 * Tenant guard: every id in `order[]` must already belong to the supplied
 * `tenant_id`. Cross-tenant id leakage → 400. Unknown id → 404.
 *
 * Gated by `requirePermission('catalog.manage_departments')` via the
 * central middlewares.ts. Audit context set to tenant_id so the
 * auditLogMiddleware (registered on /admin/*) attributes the row to it.
 *
 * Body:
 *   {
 *     tenant_id: string,
 *     order: Array<{ id: string; position: number }>
 *   }
 *
 * Response:
 *   200 { updated: number }
 *
 * NOTE: the merch module registers under its module name 'merch' (not
 * 'merchService') — see backend/apps/backend/src/modules/merch/index.ts.
 * We resolve via MERCH_MODULE for symmetry with the existing routes in
 * /admin/tenants/:tenantId/merch-categories.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { tenant_id?: string; order?: OrderItem[] };
  const { tenant_id, order } = body;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });
  if (!Array.isArray(order) || order.length === 0)
    return res.status(400).json({ error: 'order must be a non-empty array' });
  for (const item of order) {
    if (typeof item.id !== 'string' || typeof item.position !== 'number')
      return res.status(400).json({ error: 'each order item needs { id, position:number }' });
  }

  const merch: any = req.scope.resolve(MERCH_MODULE);
  const ids = order.map((o) => o.id);
  const [existing] = await merch.listAndCountMerchCategories({ id: ids });
  if (existing.length !== ids.length)
    return res.status(404).json({ error: 'one or more departments not found' });
  const wrong = existing.find((row: any) => row.tenant_id !== tenant_id);
  if (wrong) return res.status(400).json({ error: `department ${wrong.id} belongs to a different tenant` });

  (req as any).audit_context = { vendor_id: tenant_id };
  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  let updated = 0;
  await pg.transaction(async (trx: any) => {
    for (const o of order) {
      await trx.raw(
        `UPDATE merch_category SET position = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        [o.position, o.id],
      );
      updated += 1;
    }
  });
  return res.json({ updated });
}
