import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { parse } from 'csv-parse/sync';

type Row = {
  title?: string;
  sku?: string;
  barcode?: string;
  price_minor?: string;
  currency_code?: string;
  category_handle?: string;
  initial_on_hand?: string;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });

  // Body is raw text/csv. Medusa's express keeps text body in req.body when Content-Type
  // is text/csv (or similar text/*). If that's wrong, try (req as any).rawBody.
  const raw = typeof req.body === 'string'
    ? req.body
    : ((req as any).rawBody?.toString?.('utf-8') ?? '');
  if (!raw) return res.status(400).json({ error: 'csv body required' });

  let rows: Row[];
  try {
    rows = parse(raw, { columns: true, trim: true, skip_empty_lines: true });
  } catch (e: any) {
    return res.status(400).json({ error: `csv parse failed: ${e?.message}` });
  }

  const schemaSvc: any = req.scope.resolve('catalogSchemaService');
  const productModule: any = req.scope.resolve('product');
  const wms: any = req.scope.resolve('wmsService');

  const validHandles = new Set<string>(
    (await schemaSvc.listCategories()).map((c: any) => c.handle),
  );

  let created = 0;
  let failed = 0;
  const errors: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 1;
    try {
      if (!r.title) throw new Error('title required');
      if (!r.price_minor) throw new Error('price_minor required');
      const handle = r.category_handle || 'other';
      if (!validHandles.has(handle)) throw new Error(`unknown category_handle "${handle}"`);
      const priceMinor = Number(r.price_minor);
      if (!Number.isFinite(priceMinor) || priceMinor < 0) throw new Error('price_minor invalid');
      const stock = r.initial_on_hand ? Number(r.initial_on_hand) : 0;

      const createdRows = await productModule.createProducts({
        title: r.title,
        status: 'published',
        metadata: {
          created_by_vendor_id: vendor_id,
          category_handle: handle,
          schema_fields: {},
        },
        options: [{ title: 'Default', values: ['Default'] }],
        variants: [{
          title: 'Default',
          sku: r.sku || null,
          barcode: r.barcode || null,
          manage_inventory: false,
          prices: [{ amount: priceMinor, currency_code: r.currency_code || 'iqd' }],
          options: { Default: 'Default' },
        }],
      });
      const p = Array.isArray(createdRows) ? createdRows[0] : createdRows;
      if (stock > 0) {
        await wms.incrementStock({
          vendor_id, variant_id: p.variants[0].id, qty: stock,
          type: 'restock', note: 'csv import',
        });
      }
      created++;
    } catch (e: any) {
      failed++;
      errors.push({ row: rowNum, reason: e?.message ?? String(e) });
    }
  }

  res.json({ total: rows.length, created, failed, errors });
}
