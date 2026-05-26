import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const threshold = Number(req.query.threshold ?? 5);

  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const r = await pg.raw(
    `SELECT variant_id,
            on_hand_qty::numeric  AS on_hand,
            reserved_qty::numeric AS reserved
       FROM wms_stock_pool
      WHERE vendor_id = ?
        AND deleted_at IS NULL
        AND (on_hand_qty - reserved_qty) <= ?::numeric
      ORDER BY (on_hand_qty - reserved_qty) ASC
      LIMIT 100`,
    [vendor_id, threshold],
  );
  const rows = r?.rows ?? r ?? [];

  res.json({
    vendor_id, threshold,
    items: rows.map((row: any) => ({
      variant_id: row.variant_id,
      on_hand: Number(row.on_hand),
      reserved: Number(row.reserved),
      available: Number(row.on_hand) - Number(row.reserved),
    })),
  });
}
