import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const actor_id = req.query.actor_id as string | undefined;
  const moduleParam = req.query.module as string | undefined;
  const action = req.query.action as string | undefined;
  const since = req.query.since as string | undefined;
  const until = req.query.until as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const where: string[] = ['vendor_id = ?'];
  const params: any[] = [vendor_id];
  if (actor_id)    { where.push('actor_id = ?');    params.push(actor_id); }
  if (moduleParam) { where.push('module = ?');      params.push(moduleParam); }
  if (action)      { where.push('action = ?');      params.push(action); }
  if (since)       { where.push('created_at >= ?'); params.push(new Date(since)); }
  if (until)       { where.push('created_at <= ?'); params.push(new Date(until)); }
  const whereSql = where.join(' AND ');

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pg.raw(
      `SELECT id, vendor_id, actor_id, actor_type, module, action, entity_id,
              before_json, after_json, metadata, created_at
       FROM platform_audit_log
       WHERE ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ),
    pg.raw(`SELECT COUNT(*)::int AS n FROM platform_audit_log WHERE ${whereSql}`, params),
  ]);
  return res.json({ rows, total: countRows[0]?.n ?? 0, limit, offset });
}
