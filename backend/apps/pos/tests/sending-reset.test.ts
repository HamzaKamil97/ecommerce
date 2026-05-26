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

  it('does not touch sent rows', async () => {
    await db.sales_pending.put({
      client_id: 'cli_sent', vendor_id: 'v', cashier_id: 'c', terminal_id: 't',
      lines: [{ variant_id: 'v1', qty: 1, unit_price_minor: 100, name_snapshot: 'x' }],
      paid_amount_minor: 100, currency_code: 'iqd',
      client_created_at: new Date().toISOString(),
      status: 'sent', attempts: 1, last_error: null,
    });
    const reset = await resetStuckSendingRows();
    expect(reset).toBe(0);
    const row = await db.sales_pending.get('cli_sent');
    expect(row?.status).toBe('sent');
  });

  it('does not touch failed rows', async () => {
    await db.sales_pending.put({
      client_id: 'cli_failed', vendor_id: 'v', cashier_id: 'c', terminal_id: 't',
      lines: [{ variant_id: 'v1', qty: 1, unit_price_minor: 100, name_snapshot: 'x' }],
      paid_amount_minor: 100, currency_code: 'iqd',
      client_created_at: new Date().toISOString(),
      status: 'failed', attempts: 8, last_error: 'permanent',
    });
    const reset = await resetStuckSendingRows();
    expect(reset).toBe(0);
    const row = await db.sales_pending.get('cli_failed');
    expect(row?.status).toBe('failed');
  });

  it('returns 0 when nothing is stuck', async () => {
    const reset = await resetStuckSendingRows();
    expect(reset).toBe(0);
  });
});
