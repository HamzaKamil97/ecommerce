import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { CAPABILITIES } from '../../../../../permissions/capabilities';

/**
 * PUT /admin/staff/:id/capabilities
 * Owner-only endpoint that flips a single capability override on a cashier.
 *
 * Body: { key: CapabilityKey, value: true | false | null }
 *   - value=true / false : sets the override
 *   - value=null         : removes the override (cashier falls back to role default)
 *
 * Gated by `requirePermission('staff.manage')` via the central middlewares.ts.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const id = (req.params as any).id as string;
  const body = (req.body ?? {}) as { key?: string; value?: true | false | null };
  const { key, value } = body;

  if (!key) return res.status(400).json({ error: 'key required' });
  if (!(key in CAPABILITIES)) {
    return res.status(400).json({ error: `unknown capability "${key}"` });
  }
  if (value !== true && value !== false && value !== null) {
    return res.status(400).json({ error: 'value must be true, false, or null (to clear)' });
  }

  const pos: any = req.scope.resolve('posTerminalService');
  let cashier: any;
  try {
    cashier = await pos.retrieveCashier(id);
  } catch (e: any) {
    if (e?.type === 'not_found' || e?.message?.includes('not found')) {
      return res.status(404).json({ error: 'cashier not found' });
    }
    throw e;
  }

  const overrides = { ...(cashier.permission_overrides ?? {}) } as Record<string, unknown>;
  if (value === null) delete overrides[key];
  else overrides[key] = value;

  // Set vendor scope BEFORE the updateCashier call so auditLogMiddleware picks
  // up the vendor_id at res.on('finish') time.
  (req as any).audit_context = { vendor_id: cashier.vendor_id };

  // MikroORM's JsonType change-tracker treats jsonb assignments as deep-merge,
  // so deleting a key by setting `{}` (or omitting it from the object) is a
  // no-op — the prior value persists in the DB. Use raw SQL to fully replace
  // the column so "clear an override" actually clears.
  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  await pg.raw(
    `UPDATE pos_cashier SET permission_overrides = ?::jsonb WHERE id = ? AND deleted_at IS NULL`,
    [JSON.stringify(overrides), id],
  );
  const updated = await pos.retrieveCashier(id);
  return res.json({ cashier: updated });
}
