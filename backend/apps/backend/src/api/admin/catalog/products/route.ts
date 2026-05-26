import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

type Body = {
  vendor_id: string;
  title: string;
  description?: string;
  barcode?: string;
  sku?: string;
  thumbnail?: string;
  price_minor: number;
  currency_code: string;
  category_handle: string;
  schema_fields?: Record<string, unknown>;
  initial_on_hand?: number;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body ?? {}) as Partial<Body>;
  const required: (keyof Body)[] = ['vendor_id', 'title', 'price_minor', 'currency_code', 'category_handle'];
  for (const k of required) {
    if (b[k] == null) return res.status(400).json({ error: `${k} required` });
  }
  const body = b as Body;

  const schemaSvc: any = req.scope.resolve('catalogSchemaService');
  const schema = await schemaSvc.getSchemaByHandle(body.category_handle);
  if (!schema) return res.status(400).json({ error: `unknown category_handle "${body.category_handle}"` });

  const sf = body.schema_fields ?? {};
  for (const f of schema.fields) {
    if (f.required && (sf[f.key] == null || sf[f.key] === '')) {
      return res.status(400).json({ error: `schema field "${f.key}" required` });
    }
  }

  const productModule: any = req.scope.resolve('product');
  const created = await productModule.createProducts({
    title: body.title,
    description: body.description ?? null,
    thumbnail: body.thumbnail ?? null,
    status: 'published',
    metadata: {
      created_by_vendor_id: body.vendor_id,
      category_handle: body.category_handle,
      schema_fields: sf,
    },
    options: [{ title: 'Default', values: ['Default'] }],
    variants: [{
      title: 'Default',
      sku: body.sku ?? null,
      barcode: body.barcode ?? null,
      manage_inventory: false,
      prices: [{ amount: body.price_minor, currency_code: body.currency_code }],
      options: { Default: 'Default' },
    }],
  });
  const p = Array.isArray(created) ? created[0] : created;

  if (body.initial_on_hand && body.initial_on_hand > 0) {
    const wms: any = req.scope.resolve('wmsService');
    await wms.incrementStock({
      vendor_id: body.vendor_id,
      variant_id: p.variants[0].id,
      qty: body.initial_on_hand,
      type: 'restock',
      note: 'catalog initial on_hand',
    });
  }

  res.status(201).json({ product: p });
}
