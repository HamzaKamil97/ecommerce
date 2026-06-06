import { findByBarcode, searchByName, isSellable } from '../catalog';

const cat = [
  { variant_id: 'v1', title: 'Margherita Pizza', barcode: 'BC1', price_minor: 12000, weigh_at_counter: false },
  { variant_id: 'v2', title: 'Tomatoes', barcode: null, price_minor: 0, weigh_at_counter: true },
];

it('findByBarcode', () => {
  expect(findByBarcode(cat, 'BC1')?.variant_id).toBe('v1');
  expect(findByBarcode(cat, 'NOPE')).toBeUndefined();
});

it('searchByName is case-insensitive', () => {
  expect(searchByName(cat, 'pizza').length).toBe(1);
  expect(searchByName(cat, 'TOM').length).toBe(1);
});

it('isSellable', () => {
  expect(isSellable(3, false)).toBe(true);
  expect(isSellable(0, false)).toBe(false);
  expect(isSellable(0, true)).toBe(true);
});
