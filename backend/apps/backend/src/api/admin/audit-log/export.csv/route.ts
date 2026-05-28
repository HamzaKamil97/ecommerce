import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

const COLS = ['created_at','vendor_id','actor_id','actor_type','module','action','entity_id','before_json','after_json'];

function strQuery(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string') return undefined; // arrays / objects → treat as not provided
  return v;
}

function csvField(v: any): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = strQuery(req.query.vendor_id);
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const actor_id = strQuery(req.query.actor_id);
  const moduleParam = strQuery(req.query.module);
  const since = strQuery(req.query.since);
  const until = strQuery(req.query.until);

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
  if (actor_id)    { where.push('actor_id = ?'); params.push(actor_id); }
  if (moduleParam) { where.push('module = ?');   params.push(moduleParam); }
  if (sinceDate)   { where.push('created_at >= ?'); params.push(sinceDate); }
  if (untilDate)   { where.push('created_at <= ?'); params.push(untilDate); }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="audit-${vendor_id}-${Date.now()}.csv"`);
  res.write(COLS.join(',') + '\n');

  // NOTE: knex .stream() requires the optional `pg-query-stream` dep which is
  // not installed in this workspace. We fall back to a single .raw() read and
  // stream the HTTP response body chunk-by-chunk via res.write. Audit volumes
  // per vendor are bounded; swap to .stream() once pg-query-stream is added.
  const { rows } = await pg.raw(
    `SELECT created_at, vendor_id, actor_id, actor_type, module, action,
            entity_id, before_json, after_json
     FROM platform_audit_log
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC`,
    params,
  );

  for (const row of rows) {
    res.write(COLS.map((c) => csvField(row[c])).join(',') + '\n');
  }
  res.end();
}
