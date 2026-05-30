import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import { createProduct } from '../../src/api/catalog';
import type { CreateProductInput } from '../../src/api/catalog';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('catalog api client — createProduct', () => {
  it('POSTs to the manager-products route (not /admin/products)', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ product: { id: 'p_new' } });

    const input: CreateProductInput = {
      vendor_id: 'v_1',
      title: 'Pinar Milk 1L',
      price_minor: 1500,
      currency_code: 'iqd',
    };

    await createProduct(input);

    expect(client.apiPost).toHaveBeenCalledWith(
      '/admin/catalog/manager-products',
      input,
    );
  });

  it('passes the full input payload through unchanged', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ product: { id: 'p_new' } });

    const input: CreateProductInput = {
      vendor_id: 'v_2',
      title: 'Full Payload Product',
      price_minor: 2500,
      currency_code: 'iqd',
      merch_category_id: 'mc_dairy',
      sku: 'SKU1',
      barcode: '8690',
      initial_on_hand: 10,
      cost_price_minor: 2000,
      brand: 'Pinar',
      supplier_name: 'ACME',
      description: 'A full product',
      tags: ['halal', 'fresh'],
      low_stock_threshold: 5,
      internal_notes: 'aisle 4',
      schema_fields: { pack_size: '1L' },
    };

    await createProduct(input);

    expect(client.apiPost).toHaveBeenCalledWith(
      '/admin/catalog/manager-products',
      input,
    );
    // First call, first argument is the path
    expect(client.apiPost).toHaveBeenCalledTimes(1);
    const [path, passedInput] = vi.mocked(client.apiPost).mock.calls[0]!;
    expect(path).toBe('/admin/catalog/manager-products');
    expect(passedInput).toStrictEqual(input);
  });

  it('returns the response from apiPost unchanged', async () => {
    const mockResponse = { product: { id: 'p_abc', title: 'Test' } };
    vi.mocked(client.apiPost).mockResolvedValue(mockResponse);

    const result = await createProduct({
      vendor_id: 'v_3',
      title: 'Test',
      price_minor: 1000,
      currency_code: 'iqd',
    });

    expect(result).toStrictEqual(mockResponse);
  });
});
