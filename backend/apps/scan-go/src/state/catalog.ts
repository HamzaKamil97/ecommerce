import { apiGet } from '../api/client';

export type CatalogItem = {
  variant_id: string;
  title: string;
  barcode: string | null;
  price_minor: number;
  department?: string | null;
  weigh_at_counter: boolean;
  qty_available?: number;
  sellable?: boolean;
  image_url?: string | null;
};

// ---------------------------------------------------------------------------
// Module-level catalog cache (keyed by vendor_id)
// ---------------------------------------------------------------------------
const _cache = new Map<string, CatalogItem[]>();

export function getCatalog(vendorId: string): CatalogItem[] | undefined {
  return _cache.get(vendorId);
}

export async function loadCatalog(vendorId: string): Promise<CatalogItem[]> {
  const cached = _cache.get(vendorId);
  if (cached) return cached;

  // The catalog-snapshot endpoint returns items in various shapes across POS
  // versions. We normalise into CatalogItem here.
  const raw = await apiGet<any>(
    `/admin/pos-terminal/catalog-snapshot?vendor_id=${encodeURIComponent(vendorId)}`,
  );

  // Endpoint may return an array directly OR { items: [...] }
  const rawItems: any[] = Array.isArray(raw) ? raw : (raw?.items ?? []);

  const items: CatalogItem[] = rawItems.map((r: any) => ({
    variant_id: r.variant_id,
    title: r.title ?? r.name ?? '',
    barcode: r.barcode ?? null,
    price_minor: r.price_minor ?? 0,
    department: r.department ?? r.category_name ?? null,
    weigh_at_counter: Boolean(r.weigh_at_counter),
    qty_available: r.qty_available ?? r.on_hand ?? 0,
    sellable: r.sellable ?? true,
    image_url: r.image_url ?? null,
  }));

  _cache.set(vendorId, items);
  return items;
}

/** Clear the in-memory cache (e.g. after a product update). */
export function invalidateCatalog(vendorId?: string): void {
  if (vendorId) {
    _cache.delete(vendorId);
  } else {
    _cache.clear();
  }
}

// ---------------------------------------------------------------------------
// Pure helpers — no network, no side effects — exported for unit tests
// ---------------------------------------------------------------------------

/**
 * Find the first item whose barcode matches exactly.
 * Returns undefined when not found (never throws).
 */
export function findByBarcode(
  list: Pick<CatalogItem, 'variant_id' | 'barcode'>[],
  code: string,
): Pick<CatalogItem, 'variant_id' | 'barcode'> | undefined {
  return list.find((item) => item.barcode === code);
}

/**
 * Case-insensitive substring search on title. Capped at 20 results.
 */
export function searchByName<T extends Pick<CatalogItem, 'title'>>(
  list: T[],
  q: string,
): T[] {
  const lower = q.toLowerCase();
  const results: T[] = [];
  for (const item of list) {
    if (item.title.toLowerCase().includes(lower)) {
      results.push(item);
      if (results.length >= 20) break;
    }
  }
  return results;
}

/**
 * An item is sellable if it has stock OR is weighed at the counter
 * (weighed items don't decrement inventory until final weight is known).
 */
export function isSellable(qtyAvailable: number, weighAtCounter: boolean): boolean {
  return qtyAvailable > 0 || weighAtCounter;
}
