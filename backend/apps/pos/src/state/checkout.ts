import { useCart } from './cart';
import { useSession } from './session';
import { db } from '../db/dexie';
import { TERMINAL_ID, VENDOR_ID } from '../env';

export type CommitArgs = { paid_amount_minor: number };
export type CommitResult = {
  client_id: string;
  total_minor: number;
  change_due_minor: number;
};

export async function commitSale(args: CommitArgs): Promise<CommitResult> {
  const session = useSession.getState();
  if (!session.cashier_id) throw new Error('No cashier signed in');
  const cart = useCart.getState();
  if (cart.lines.length === 0) throw new Error('Cart is empty');
  const total = cart.subtotalMinor();
  const change = Math.max(0, args.paid_amount_minor - total);
  const client_id = `cli_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  await db.sales_pending.put({
    client_id,
    vendor_id: VENDOR_ID,
    cashier_id: session.cashier_id,
    terminal_id: TERMINAL_ID,
    lines: cart.lines.map((l) => ({
      variant_id: l.variant_id,
      qty: l.qty,
      unit_price_minor: l.unit_price_minor,
      name_snapshot: l.name,
    })),
    paid_amount_minor: args.paid_amount_minor,
    currency_code: 'iqd',
    client_created_at: new Date().toISOString(),
    status: 'queued',
    attempts: 0,
    last_error: null,
  });
  cart.reset();
  return { client_id, total_minor: total, change_due_minor: change };
}
