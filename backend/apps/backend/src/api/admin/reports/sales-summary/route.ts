import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });

  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400_000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const bucket = (req.query.bucket as string | undefined) ?? 'day';
  if (!['day', 'hour', 'week'].includes(bucket)) {
    return res.status(400).json({ error: 'bucket must be day | hour | week' });
  }

  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const sql = `
    SELECT date_trunc('${bucket}', created_at) AS bucket_at,
           COUNT(*) AS sale_count,
           SUM(total_minor::numeric) AS revenue_minor
      FROM pos_sale
     WHERE vendor_id = ?
       AND status = 'completed'
       AND deleted_at IS NULL
       AND created_at >= ? AND created_at <= ?
     GROUP BY 1
     ORDER BY 1 ASC`;
  const r = await pg.raw(sql, [vendor_id, from, to]);
  const rows = r?.rows ?? r ?? [];

  res.json({
    vendor_id, from, to, bucket,
    buckets: rows.map((row: any) => ({
      bucket_at: row.bucket_at,
      sale_count: Number(row.sale_count),
      revenue_minor: Number(row.revenue_minor),
    })),
  });
}
