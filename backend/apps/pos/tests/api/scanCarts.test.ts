import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import { loadByCode, collect, buildPricedLines } from '../../src/api/scanCarts';

vi.mock('../../src/api/client', () => ({
  api: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

const mockLine = (overrides: Partial<{
  id: string; variant_id: string; title: string; qty: number;
  unit_price_minor: number; weigh_at_counter: boolean; priced: boolean;
}> = {}) => ({
  id: 'l1',
  variant_id: 'var_001',
  title: 'Margherita Pizza',
  qty: 1,
  unit_price_minor: 12000,
  weigh_at_counter: false,
  priced: true,
  ...overrides,
});

const mockCart = {
  id: 'cart_abc123',
  vendor_id: 'v_test',
  status: 'PENDING_CASHIER',
  short_code: 'K7·4Q2',
  expires_at: '2026-06-06T12:00:00Z',
  lines: [
    mockLine({ id: 'l1', weigh_at_counter: false, priced: true }),
    mockLine({ id: 'l2', title: 'Tomatoes (loose)', weigh_at_counter: true, priced: false, unit_price_minor: 0 }),
  ],
};

beforeEach(() => vi.clearAllMocks());

// ─── loadByCode ───────────────────────────────────────────────────────────────

describe('loadByCode', () => {
  it('calls apiGet with the correct URL and unwraps {cart}', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ cart: mockCart });
    const out = await loadByCode('K74Q2');
    expect(client.apiGet).toHaveBeenCalledWith('/pos/scan-carts/by-code/K74Q2');
    expect(out).toEqual(mockCart);
  });

  it('propagates errors (404, 410, etc.) from apiGet', async () => {
    const err = new Error('Not Found');
    vi.mocked(client.apiGet).mockRejectedValue(err);
    await expect(loadByCode('BADCODE')).rejects.toThrow('Not Found');
  });
});

// ─── collect ─────────────────────────────────────────────────────────────────

describe('collect', () => {
  it('calls apiPost with the correct URL and body', async () => {
    const payload = {
      cashier_id: 'c_001',
      terminal_id: 'term_abc',
      priced_lines: [{ line_id: 'l2', unit_price_minor: 2500 }],
      paid_amount_minor: 14500,
    };
    const mockResponse = {
      cart: { status: 'PAID', paid_sale_id: 'sale_xyz' },
      sale: { sale_id: 'sale_xyz', total_minor: 14500, change_due_minor: 0 },
    };
    vi.mocked(client.apiPost).mockResolvedValue(mockResponse);
    const out = await collect('cart_abc123', payload);
    expect(client.apiPost).toHaveBeenCalledWith('/pos/scan-carts/cart_abc123/collect', payload);
    expect(out).toEqual(mockResponse);
  });

  it('propagates errors (400 unpriced, 409 conflict) from apiPost', async () => {
    const err = new Error('Conflict');
    vi.mocked(client.apiPost).mockRejectedValue(err);
    await expect(
      collect('cart_abc123', {
        cashier_id: 'c_001',
        terminal_id: 'term_abc',
        priced_lines: [],
        paid_amount_minor: 0,
      }),
    ).rejects.toThrow('Conflict');
  });
});

// ─── buildPricedLines ─────────────────────────────────────────────────────────

describe('buildPricedLines', () => {
  it('maps weigh lines and throws on missing price', () => {
    const lines = [
      { id: 'l1', weigh_at_counter: false, priced: true },
      { id: 'l2', weigh_at_counter: true, priced: false },
    ];
    expect(buildPricedLines(lines, { l2: 2500 })).toEqual([{ line_id: 'l2', unit_price_minor: 2500 }]);
    expect(() => buildPricedLines(lines, {})).toThrow(); // l2 weigh line unpriced
  });

  it('returns empty array when there are no weigh lines', () => {
    const lines = [
      { id: 'l1', weigh_at_counter: false, priced: true },
      { id: 'l3', weigh_at_counter: false, priced: true },
    ];
    expect(buildPricedLines(lines, {})).toEqual([]);
  });

  it('handles multiple weigh lines, all priced', () => {
    const lines = [
      { id: 'l1', weigh_at_counter: true, priced: false },
      { id: 'l2', weigh_at_counter: true, priced: false },
    ];
    const result = buildPricedLines(lines, { l1: 1000, l2: 2000 });
    expect(result).toEqual([
      { line_id: 'l1', unit_price_minor: 1000 },
      { line_id: 'l2', unit_price_minor: 2000 },
    ]);
  });

  it('throws with informative message naming the unpriced weigh line id', () => {
    const lines = [{ id: 'l9', weigh_at_counter: true, priced: false }];
    expect(() => buildPricedLines(lines, {})).toThrow('weigh line l9 needs a price');
  });

  it('skips non-weigh lines even if they appear in priceByLineId', () => {
    const lines = [
      { id: 'l1', weigh_at_counter: false, priced: true },
      { id: 'l2', weigh_at_counter: true, priced: false },
    ];
    // l1 present in map but weigh_at_counter=false — must be skipped
    const result = buildPricedLines(lines, { l1: 9999, l2: 1500 });
    expect(result).toEqual([{ line_id: 'l2', unit_price_minor: 1500 }]);
  });
});
