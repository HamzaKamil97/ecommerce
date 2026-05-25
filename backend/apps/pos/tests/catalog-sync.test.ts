import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, resetDbForTests } from '../src/db/dexie';
import { syncCatalog } from '../src/db/catalog-sync';

describe('catalog sync', () => {
  beforeEach(async () => { await resetDbForTests(); });

  it('upserts variants into the catalog table from API response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        vendor_id: 'v1',
        generated_at: new Date().toISOString(),
        items: [
          { variant_id: 'v_1', product_id: 'p_1', sku: 'S1', barcode: '111', name: 'Bread',
            price_minor: 1000, currency_code: 'iqd', image_url: null, on_hand: 5 },
          { variant_id: 'v_2', product_id: 'p_2', sku: 'S2', barcode: '222', name: 'Milk',
            price_minor: 2500, currency_code: 'iqd', image_url: null, on_hand: 3 },
        ],
      }),
    });
    (globalThis as any).fetch = fetchMock;
    const n = await syncCatalog('v1');
    expect(n).toBe(2);
    const rows = await db.catalog.toArray();
    expect(rows.map(r => r.barcode).sort()).toEqual(['111', '222']);
  });

  it('updates existing variant on re-sync, never duplicates', async () => {
    const mk = (price: number) => ({
      ok: true, json: async () => ({
        vendor_id: 'v1', generated_at: '',
        items: [{ variant_id: 'v_1', product_id: 'p_1', sku: 'S1', barcode: '111',
          name: 'Bread', price_minor: price, currency_code: 'iqd', image_url: null, on_hand: 5 }],
      }),
    });
    (globalThis as any).fetch = vi.fn().mockResolvedValueOnce(mk(1000)).mockResolvedValueOnce(mk(1200));
    await syncCatalog('v1');
    await syncCatalog('v1');
    const rows = await db.catalog.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].price_minor).toBe(1200);
  });

  it('looks up by barcode in O(indexed) time', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({
        vendor_id: 'v1', generated_at: '',
        items: [{ variant_id: 'v_1', product_id: 'p_1', sku: 'S1', barcode: '8901234567890',
          name: 'X', price_minor: 1000, currency_code: 'iqd', image_url: null, on_hand: 1 }],
      }),
    });
    await syncCatalog('v1');
    const row = await db.catalog.where('barcode').equals('8901234567890').first();
    expect(row?.name).toBe('X');
  });
});
