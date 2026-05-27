import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export type CountStatus = 'in_progress' | 'applied' | 'cancelled';
export type CountReason =
  | 'damaged'
  | 'theft'
  | 'miscount'
  | 'received_late'
  | 'expired'
  | 'other';

export type CountSession = {
  id: string;
  vendor_id: string;
  actor_id: string;
  scope: string;
  status: CountStatus;
  expected_total: number | null;
  counted_total: number | null;
  delta_total: number | null;
  note: string | null;
  applied_at: string | null;
};

export type CountLine = {
  id: string;
  session_id: string;
  variant_id: string;
  system_qty: number;
  actual_qty: number;
  delta: number;
  reason: CountReason | null;
};

export async function openCount(p: {
  vendor_id: string;
  actor_id: string;
  scope: string;
}): Promise<CountSession> {
  const r = await apiPost<{ session: CountSession }>('/pos/inventory-count', p);
  return r.session;
}

export async function getCount(
  id: string,
): Promise<{ session: CountSession; lines: CountLine[] }> {
  return await apiGet<{ session: CountSession; lines: CountLine[] }>(
    `/pos/inventory-count/${id}`,
  );
}

export async function addCountLine(
  id: string,
  p: { variant_id: string; system_qty: number; actual_qty: number; reason?: CountReason },
): Promise<CountLine> {
  const r = await apiPatch<{ line: CountLine }>(`/pos/inventory-count/${id}`, p);
  return r.line;
}

export async function cancelCount(id: string): Promise<CountSession> {
  const r = await apiDelete<{ session: CountSession }>(`/pos/inventory-count/${id}`);
  return r.session;
}

export type ApplyCountResult =
  | CountSession
  | {
      partial: true;
      applied_line_index: number;
      failed_variant_id: string;
      session_id: string;
    };

export async function applyCount(
  id: string,
  p: { actor_id: string },
): Promise<ApplyCountResult> {
  // catalog.stock_count permission-gated. Send x-cashier-id so middleware can resolve role.
  try {
    const r = await apiPost<{ session: CountSession }>(
      `/pos/inventory-count/${id}/apply`,
      p,
      { headers: { 'x-cashier-id': p.actor_id } },
    );
    return r.session;
  } catch (e: any) {
    // 207 Multi-Status - partial failure with breadcrumb
    const status = e?.status ?? e?.response?.status;
    const data = e?.payload ?? e?.response?.data ?? e?.data;
    if (status === 207 && data?.code === 'COUNT_APPLY_PARTIAL') {
      return {
        partial: true,
        applied_line_index: data.applied_line_index,
        failed_variant_id: data.failed_variant_id,
        session_id: data.session_id,
      };
    }
    throw e;
  }
}
