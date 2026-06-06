import { useCart } from '../cart';

beforeEach(() => useCart.getState().clear());

it('addItem appends + recomputes subtotal (weigh lines excluded from subtotal, counted in item_count)', () => {
  const s = useCart.getState();
  s.addItem({ variant_id: 'v1', title: 'Pizza', unit_price_minor: 12000, qty: 1, weigh_at_counter: false });
  s.addItem({ variant_id: 'v2', title: 'Tomatoes', unit_price_minor: 0, qty: 1, weigh_at_counter: true });
  const st = useCart.getState();
  expect(st.item_count).toBe(2);
  expect(st.subtotal_minor).toBe(12000); // weigh line excluded
});

it('incQty / removeItem', () => {
  const s = useCart.getState();
  s.addItem({ variant_id: 'v1', title: 'Pizza', unit_price_minor: 12000, qty: 1, weigh_at_counter: false });
  s.incQty('v1');
  expect(useCart.getState().subtotal_minor).toBe(24000);
  s.removeItem('v1');
  expect(useCart.getState().item_count).toBe(0);
});

it('lock() blocks further adds', () => {
  const s = useCart.getState();
  s.addItem({ variant_id: 'v1', title: 'Pizza', unit_price_minor: 12000, qty: 1, weigh_at_counter: false });
  s.lock('K7ABCD');
  expect(useCart.getState().locked).toBe(true);
  expect(() =>
    useCart.getState().addItem({ variant_id: 'v3', title: 'X', unit_price_minor: 1, qty: 1, weigh_at_counter: false }),
  ).toThrow();
});
