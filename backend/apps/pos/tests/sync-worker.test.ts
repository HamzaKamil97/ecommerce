import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, resetDbForTests } from '../src/db/dexie';
import { drainOnce } from '../src/sync/sync-worker';

describe('sync worker drainOnce', () => {
  beforeEach(async () => {
    await resetDbForTests();
    await db.sales_pending.bulkPut([
      { client_id: 'c_1', vendor_id: 'v', cashier_id: 'c', terminal_id: 't',
        lines: [{ variant_id: 'x', qty: 1, unit_price_minor: 100, name_snapshot: 'X' }],
        paid_amount_minor: 100, currency_code: 'iqd',
        client_created_at: new Date().toISOString(),
        status: 'queued', attempts: 0, last_error: null },
      { client_id: 'c_2', vendor_id: 'v', cashier_id: 'c', terminal_id: 't',
        lines: [{ variant_id: 'y', qty: 2, unit_price_minor: 250, name_snapshot: 'Y' }],
        paid_amount_minor: 500, currency_code: 'iqd',
        client_created_at: new Date().toISOString(),
        status: 'queued', attempts: 0, last_error: null },
    ]);
  });

  it('POSTs each queued sale once and marks it sent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sale: { sale_id: 'pos_x', total_minor: 100, change_due_minor: 0, stock_after: [] } }),
    });
    (globalThis as any).fetch = fetchMock;
    const result = await drainOnce();
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const remaining = await db.sales_pending.where('status').equals('queued').count();
    expect(remaining).toBe(0);
    const sent = await db.sales_pending.where('status').equals('sent').count();
    expect(sent).toBe(2);
  });

  it('on HTTP 5xx marks failed + increments attempts, leaves status queued for retry', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false, status: 503, json: async () => ({ error: 'down' }),
    });
    const r = await drainOnce();
    expect(r.failed).toBe(2);
    const rows = await db.sales_pending.toArray();
    expect(rows.every((x) => x.status === 'queued' && x.attempts === 1)).toBe(true);
  });

  it('on HTTP 4xx (validation) marks status=failed permanently', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false, status: 400, json: async () => ({ error: 'bad' }),
    });
    await drainOnce();
    const rows = await db.sales_pending.toArray();
    expect(rows.every((x) => x.status === 'failed')).toBe(true);
  });

  it('treats duplicate client_id (server returns same sale_id) as success', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ sale: { sale_id: 'pos_dup', total_minor: 100, change_due_minor: 0, stock_after: [] } }),
    });
    await drainOnce();
    await drainOnce();
    const rows = await db.sales_pending.toArray();
    expect(rows.every((x) => x.status === 'sent')).toBe(true);
  });

  it('5xx becomes permanent failure after MAX_ATTEMPTS retries', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false, status: 503, json: async () => ({ error: 'down' }),
    });
    // Run drainOnce 8 times (the MAX_ATTEMPTS constant). After the 8th attempt, status should be 'failed'.
    for (let i = 0; i < 8; i++) await drainOnce();
    const rows = await db.sales_pending.toArray();
    expect(rows.every((x) => x.status === 'failed')).toBe(true);
    expect(rows.every((x) => x.attempts === 8)).toBe(true);
  });
});
