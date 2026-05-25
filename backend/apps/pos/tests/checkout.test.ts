import { describe, it, expect, beforeEach } from 'vitest';
import { useCart } from '../src/state/cart';
import { commitSale } from '../src/state/checkout';
import { db, resetDbForTests } from '../src/db/dexie';
import { useSession } from '../src/state/session';

describe('checkout commitSale', () => {
  beforeEach(async () => {
    await resetDbForTests();
    useCart.getState().reset();
    useSession.getState().signIn({ cashier_id: 'c_1', cashier_name: 'A', role: 'cashier' });
    useCart.getState().addLineFromScan({ variant_id: 'v_1', name: 'X', unit_price_minor: 1000, qty: 2 });
  });

  it('enqueues a pending sale in IndexedDB with a stable client_id', async () => {
    const out = await commitSale({ paid_amount_minor: 3000 });
    expect(out.client_id).toMatch(/^cli_/);
    const pending = await db.sales_pending.toArray();
    expect(pending).toHaveLength(1);
    expect(pending[0].lines).toHaveLength(1);
    expect(pending[0].paid_amount_minor).toBe(3000);
    expect(pending[0].status).toBe('queued');
  });

  it('clears the cart after commit', async () => {
    await commitSale({ paid_amount_minor: 3000 });
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('returns total + change_due correctly', async () => {
    const out = await commitSale({ paid_amount_minor: 5000 });
    expect(out.total_minor).toBe(2000);
    expect(out.change_due_minor).toBe(3000);
  });

  it('rejects when no cashier is signed in', async () => {
    useSession.getState().signOut();
    await expect(commitSale({ paid_amount_minor: 3000 })).rejects.toThrow(/cashier/i);
  });

  it('rejects when the cart is empty', async () => {
    useCart.getState().reset();
    await expect(commitSale({ paid_amount_minor: 100 })).rejects.toThrow(/empty/i);
  });

  it('change_due_minor clamps to 0 when paid < total', async () => {
    const out = await commitSale({ paid_amount_minor: 1000 });
    expect(out.total_minor).toBe(2000);
    expect(out.change_due_minor).toBe(0); // 1000 paid for 2000 total — clamped
  });
});
