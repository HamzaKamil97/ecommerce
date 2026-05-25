import { db, PendingSaleRow } from '../db/dexie';
import { postSale } from '../api/pos';
import { useNet } from './network-status';

const MAX_ATTEMPTS = 8;

export type DrainResult = { sent: number; failed: number };

async function publishQueueDepth() {
  const n = await db.sales_pending.where('status').equals('queued').count();
  useNet.getState().setQueueDepth(n);
}

export async function drainOnce(): Promise<DrainResult> {
  let sent = 0, failed = 0;
  const queued: PendingSaleRow[] = await db.sales_pending.where('status').equals('queued').toArray();
  for (const row of queued) {
    try {
      await db.sales_pending.update(row.client_id, { status: 'sending', attempts: row.attempts + 1 });
      await postSale({
        client_id: row.client_id,
        vendor_id: row.vendor_id,
        cashier_id: row.cashier_id,
        terminal_id: row.terminal_id,
        lines: row.lines,
        paid_amount_minor: row.paid_amount_minor,
        currency_code: row.currency_code,
        client_created_at: row.client_created_at,
      });
      await db.sales_pending.update(row.client_id, { status: 'sent', last_error: null });
      sent++;
    } catch (e: any) {
      failed++;
      const status = e?.status;
      const permanent = typeof status === 'number' && status >= 400 && status < 500;
      const overAttempts = row.attempts + 1 >= MAX_ATTEMPTS;
      const next = permanent || overAttempts ? 'failed' : 'queued';
      await db.sales_pending.update(row.client_id, {
        status: next, last_error: String(e?.message ?? e),
      });
    }
  }
  await publishQueueDepth();
  return { sent, failed };
}

let timer: any = null;

export function startBackgroundSync(intervalMs = 5000) {
  if (timer) return;
  publishQueueDepth();
  timer = setInterval(() => {
    if (!useNet.getState().online) return;
    drainOnce().catch(() => {});
  }, intervalMs);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => drainOnce().catch(() => {}));
  }
}

export function stopBackgroundSync() {
  if (timer) { clearInterval(timer); timer = null; }
}
