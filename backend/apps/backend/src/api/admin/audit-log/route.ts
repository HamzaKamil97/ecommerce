import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

function strQuery(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string') return undefined; // arrays / objects → treat as not provided
  return v;
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = strQuery(req.query.vendor_id);
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const actor_id = strQuery(req.query.actor_id);
  const moduleParam = strQuery(req.query.module);
  const action = strQuery(req.query.action);
  const since = strQuery(req.query.since);
  const until = strQuery(req.query.until);

  // limit validation: must be finite if provided, then clamp to [1, 200]
  let limit = 50;
  if (req.query.limit !== undefined) {
    const n = Number(req.query.limit);
    if (!Number.isFinite(n)) return res.status(400).json({ error: 'limit must be a finite number' });
    limit = Math.min(Math.max(Math.trunc(n), 1), 200);
  }

  // offset validation: must be finite if provided, then clamp to >= 0
  let offset = 0;
  if (req.query.offset !== undefined) {
    const n = Number(req.query.offset);
    if (!Number.isFinite(n)) return res.status(400).json({ error: 'offset must be a finite number' });
    offset = Math.max(Math.trunc(n), 0);
  }

  // date validation: reject Invalid Date
  let sinceDate: Date | undefined;
  if (since) {
    sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) return res.status(400).json({ error: 'since must be a valid date' });
  }
  let untilDate: Date | undefined;
  if (until) {
    untilDate = new Date(until);
    if (isNaN(untilDate.getTime())) return res.status(400).json({ error: 'until must be a valid date' });
  }

  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const where: string[] = ['vendor_id = ?'];
  where.push('deleted_at IS NULL');
  const params: any[] = [vendor_id];
  if (actor_id)    { where.push('actor_id = ?');    params.push(actor_id); }
  if (moduleParam) { where.push('module = ?');      params.push(moduleParam); }
  if (action)      { where.push('action = ?');      params.push(action); }
  if (sinceDate)   { where.push('created_at >= ?'); params.push(sinceDate); }
  if (untilDate)   { where.push('created_at <= ?'); params.push(untilDate); }
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
