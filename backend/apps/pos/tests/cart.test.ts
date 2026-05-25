import { describe, it, expect, beforeEach } from 'vitest';
import { useCart } from '../src/state/cart';

describe('cart store', () => {
  beforeEach(() => { useCart.getState().reset(); });

  it('adds a new line on scan', () => {
    useCart.getState().addLineFromScan({
      variant_id: 'v_1', name: 'Bread', unit_price_minor: 1000, qty: 1,
    });
    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().lines[0]!.qty).toBe(1);
  });

  it('increments qty when same variant scanned twice', () => {
    const s = useCart.getState();
    s.addLineFromScan({ variant_id: 'v_1', name: 'Bread', unit_price_minor: 1000, qty: 1 });
    s.addLineFromScan({ variant_id: 'v_1', name: 'Bread', unit_price_minor: 1000, qty: 1 });
    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().lines[0]!.qty).toBe(2);
  });

  it('subtotal recalculates in <100ms for 200 lines (speed bar)', () => {
    const s = useCart.getState();
    for (let i = 0; i < 200; i++) {
      s.addLineFromScan({ variant_id: `v_${i}`, name: `n${i}`, unit_price_minor: 100 + i, qty: i % 5 + 1 });
    }
    const t0 = performance.now();
    const total = useCart.getState().subtotalMinor();
    const dt = performance.now() - t0;
    expect(total).toBeGreaterThan(0);
    expect(dt).toBeLessThan(100);
  });

  it('removes a line', () => {
    const s = useCart.getState();
    s.addLineFromScan({ variant_id: 'v_a', name: 'A', unit_price_minor: 500, qty: 1 });
    s.addLineFromScan({ variant_id: 'v_b', name: 'B', unit_price_minor: 700, qty: 1 });
    s.removeLine('v_a');
    expect(useCart.getState().lines.map(l => l.variant_id)).toEqual(['v_b']);
  });

  it('resets to empty after checkout success', () => {
    const s = useCart.getState();
    s.addLineFromScan({ variant_id: 'v_a', name: 'A', unit_price_minor: 500, qty: 1 });
    s.reset();
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('setQty to 0 removes the line', () => {
    const s = useCart.getState();
    s.addLineFromScan({ variant_id: 'v_a', name: 'A', unit_price_minor: 500, qty: 3 });
    s.setQty('v_a', 0);
    expect(useCart.getState().lines).toHaveLength(0);
  });
});
