import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDbForTests } from '../src/db/dexie';
import { resetStuckSendingRows } from '../src/sync/sync-worker';

describe('resetStuckSendingRows', () => {
  beforeEach(async () => { await resetDbForTests(); });

  it('moves all status=sending rows back to queued', async () => {
    await db.sales_pending.put({
      client_id: 'cli_stuck', vendor_id: 'v', cashier_id: 'c', terminal_id: 't',
      lines: [{ variant_id: 'v1', qty: 1, unit_price_minor: 100, name_snapshot: 'x' }],
      paid_amount_minor: 100, currency_code: 'iqd',
      client_created_at: new Date().toISOString(),
      status: 'sending', attempts: 1, last_error: null,
    });
    const reset = await resetStuckSendingRows();
    expect(reset).toBe(1);
    const row = await db.sales_pending.get('cli_stuck');
    expect(row?.status).toBe('queued');
  });

  it('does not touch sent or failed rows', async () => {
    await db.sales_pending.put({
      client_id: 'cli_sent', vendor_id: 'v', cashier_id: 'c', terminal_id: 't',
      lines: [{ variant_id: 'v1', qty: 1, unit_price_minor: 100, name_snapshot: 'x' }],
      paid_amount_minor: 100, currency_code: 'iqd',
      client_created_at: new Date().toISOString(),
      status: 'sent', attempts: 1, last_error: null,
    });
    const reset = await resetStuckSendingRows();
    expect(reset).toBe(0);
  });
});
