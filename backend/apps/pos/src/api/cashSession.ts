import { apiGet, apiPost } from './client';

export type CashSession = {
  id: string;
  vendor_id: string;
  terminal_id: string;
  cashier_id: string;
  status: 'open' | 'closed';
  opening_float_minor: number;
  cash_sales_minor: number;
  refunds_minor: number;
  expected_total_minor: number;
  counted_total_minor: number | null;
  diff_minor: number | null;
  denomination_count: Record<string, number> | null;
  opened_at: string;
  closed_at: string | null;
  note: string | null;
  currency_code: string;
};

export async function openSession(p: {
  vendor_id: string;
  terminal_id: string;
  cashier_id: string;
  opening_float_minor: number;
  currency_code?: string;
}): Promise<CashSession> {
  const r = await apiPost<{ session: CashSession }>('/pos/cash-session/open', p);
  return r.session;
}

export async function closeSession(p: {
  session_id: string;
  cashier_id: string;
  counted_total_minor: number;
  denomination_count: Record<string, number>;
  note?: string;
}): Promise<CashSession> {
  // PIN-gated route - sends x-cashier-id so middleware can resolve role + permission
  const r = await apiPost<{ session: CashSession }>('/pos/cash-session/close', p, {
    headers: { 'x-cashier-id': p.cashier_id },
  });
  return r.session;
}

export async function getCurrentSession(terminal_id: string): Promise<CashSession | null> {
  const r = await apiGet<{ session: CashSession | null }>(
    `/pos/cash-session/current?terminal_id=${encodeURIComponent(terminal_id)}`,
  );
  return r.session;
}

export async function listSessions(
  vendor_id: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<CashSession[]> {
  const qs = new URLSearchParams({
    vendor_id,
    ...(opts.limit ? { limit: String(opts.limit) } : {}),
    ...(opts.offset ? { offset: String(opts.offset) } : {}),
  });
  const r = await apiGet<{ sessions: CashSession[] }>(`/pos/cash-session?${qs}`);
  return r.sessions;
}
