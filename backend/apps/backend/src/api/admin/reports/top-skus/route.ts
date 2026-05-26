import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400_000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const limit = Math.min(100, Number(req.query.limit ?? 20));

  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const sql = `
    SELECT l.variant_id,
           MIN(l.name_snapshot) AS name_snapshot,
           SUM(l.qty::numeric)  AS units_sold,
           SUM(l.qty::numeric * l.unit_price_minor::numeric) AS revenue_minor,
           COUNT(DISTINCT s.id) AS sale_count
      FROM pos_sale_line l
      JOIN pos_sale s ON s.id = l.sale_id
     WHERE s.vendor_id = ?
       AND s.status = 'completed'
       AND s.deleted_at IS NULL
       AND l.deleted_at IS NULL
       AND s.created_at >= ? AND s.created_at <= ?
     GROUP BY l.variant_id
     ORDER BY revenue_minor DESC
     LIMIT ?`;
  const r = await pg.raw(sql, [vendor_id, from, to, limit]);
  const rows = r?.rows ?? r ?? [];

  res.json({
    vendor_id, from, to,
    items: rows.map((row: any) => ({
      variant_id: row.variant_id,
      name_snapshot: row.name_snapshot,
      units_sold: Number(row.units_sold),
      revenue_minor: Number(row.revenue_minor),
      sale_count: Number(row.sale_count),
    })),
  });
}
