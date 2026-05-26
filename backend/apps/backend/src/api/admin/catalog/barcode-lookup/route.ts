import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const code = (req.query.code as string | undefined)?.trim();
  if (!code) return res.status(400).json({ error: 'code required' });
  if (!/^\d{6,14}$/.test(code)) return res.status(400).json({ error: 'code must be 6-14 digits' });

  try {
    const resp = await fetch(`${OFF_BASE}/${encodeURIComponent(code)}.json`, {
      headers: { 'User-Agent': 'Hanoot/0.1 (https://hanoot.iq)' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!resp.ok) return res.json({ found: false, code });
    const json: any = await resp.json();
    if (json.status !== 1 || !json.product) return res.json({ found: false, code });
    const p = json.product;
    res.json({
      found: true,
      code,
      name: p.product_name || p.product_name_en || null,
      brand: p.brands || null,
      image_url: p.image_front_url || p.image_url || null,
      categories: typeof p.categories === 'string' ? p.categories.split(',').map((s: string) => s.trim()) : [],
      weight_grams: p.product_quantity ? Number(p.product_quantity) : null,
      raw_categories_tag: p.categories_tags ?? [],
    });
  } catch {
    res.json({ found: false, code, error: 'upstream_unavailable' });
  }
}
