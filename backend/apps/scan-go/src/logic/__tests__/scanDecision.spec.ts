import { decideScan } from '../scanDecision';

it('not found → reject(not_found)', () => {
  const r = decideScan({ found: false });
  expect(r.action).toBe('reject');
  if (r.action === 'reject') expect(r.reason).toBe('not_found');
});

it('found but not sellable → reject(out_of_stock)', () => {
  const r = decideScan({
    found: true,
    variant_id: 'v1',
    title: 'Whole Milk 1L',
    price_minor: 2000,
    qty_available: 0,
    weigh_at_counter: false,
    sellable: false,
  });
  expect(r.action).toBe('reject');
  if (r.action === 'reject') expect(r.reason).toBe('out_of_stock');
});

it('found + sellable → add with correct fields', () => {
  const r = decideScan({
    found: true,
    variant_id: 'v2',
    title: 'Margherita Pizza',
    price_minor: 12000,
    qty_available: 5,
    weigh_at_counter: false,
    sellable: true,
  });
  expect(r.action).toBe('add');
  if (r.action === 'add') {
    expect(r.variant_id).toBe('v2');
    expect(r.price_minor).toBe(12000);
    expect(r.weigh_at_counter).toBe(false);
  }
});

it('weigh_at_counter item is sellable regardless of qty', () => {
  const r = decideScan({
    found: true,
    variant_id: 'v3',
    title: 'Tomatoes (loose)',
    price_minor: 0,
    qty_available: 0,
    weigh_at_counter: true,
    sellable: true,  // API marks these as sellable
  });
  expect(r.action).toBe('add');
});
