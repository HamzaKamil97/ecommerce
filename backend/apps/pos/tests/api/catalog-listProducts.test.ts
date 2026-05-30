import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import { listProducts } from '../../src/api/catalog';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('catalog api client — listProducts', () => {
  it('GETs the manager-products route with vendor_id encoded', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      products: [
        {
          id: 'p1', variant_id: 'v1', merch_category_id: 'mc1',
          title: 'Milk', sku: 'S', barcode: 'B', price_minor: 1500,
          currency_code: 'iqd', stock_qty: 7, thumb_emoji: null, thumb: null,
        },
      ],
    });
    const out = await listProducts('v_test');
    expect(client.apiGet).toHaveBeenCalledWith(
      '/admin/catalog/manager-products?vendor_id=v_test',
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ merch_category_id: 'mc1', stock_qty: 7 });
  });

  it('maps a full ProductCard payload to Product[]', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      products: [
        {
          id: 'p1', variant_id: 'v1', merch_category_id: 'mc1',
          title: 'Milk', sku: 'S', barcode: 'B', price_minor: 1500,
          currency_code: 'iqd', stock_qty: 7, thumb_emoji: null, thumb: null,
        },
      ],
    });
    const out = await listProducts('v_test');
    expect(out[0]).toMatchObject({
      id: 'p1',
      merch_category_id: 'mc1',
      stock_qty: 7,
    });
  });

  it('returns [] when payload has no products key', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({});
    const out = await listProducts('v_test');
    expect(out).toEqual([]);
  });
});
