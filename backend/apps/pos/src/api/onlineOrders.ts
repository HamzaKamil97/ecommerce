import { apiGet, apiPost } from './client';

export type OnlineOrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'picking'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type OnlineOrderLine = {
  id: string;
  variant_id: string;
  title: string;
  qty: number;
  unit_price_minor: number;
  line_total_minor: number;
  aisle_hint: string | null;
  picked: boolean;
  oos: boolean;
};

export type OnlineOrder = {
  id: string;
  vendor_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total_minor: number;
  currency_code: string;
  status: OnlineOrderStatus;
  commission_rate_bps_snapshot: number;
  commission_minor: number;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  voice_note_url: string | null;
  placed_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  delivered_at: string | null;
  lines?: OnlineOrderLine[];
};

export async function listOrders(
  vendor_id: string,
  status: OnlineOrderStatus | 'all' = 'pending',
): Promise<OnlineOrder[]> {
  const r = await apiGet<{ orders?: OnlineOrder[] }>(
    `/pos/online-orders?vendor_id=${encodeURIComponent(vendor_id)}&status=${status}`,
  );
  return r.orders ?? [];
}

export async function getOrder(id: string): Promise<OnlineOrder | null> {
  try {
    const r = await apiGet<{ order?: OnlineOrder | null }>(`/pos/online-orders/${id}`);
    return r.order ?? null;
  } catch (e: any) {
    if (e?.status === 404 || e?.response?.status === 404) return null;
    throw e;
  }
}

export async function acceptOrder(id: string): Promise<OnlineOrder> {
  const r = await apiPost<{ order: OnlineOrder }>(`/pos/online-orders/${id}/accept`, {});
  return r.order;
}

export async function rejectOrder(id: string): Promise<OnlineOrder> {
  const r = await apiPost<{ order: OnlineOrder }>(`/pos/online-orders/${id}/reject`, {});
  return r.order;
}

export async function partialAcceptOrder(
  id: string,
  oos_line_ids: string[],
): Promise<{ order: OnlineOrder; oos_line_count: number }> {
  return await apiPost<{ order: OnlineOrder; oos_line_count: number }>(
    `/pos/online-orders/${id}/partial`,
    { oos_line_ids },
  );
}

export async function handoffOrder(id: string): Promise<OnlineOrder> {
  const r = await apiPost<{ order: OnlineOrder }>(`/pos/online-orders/${id}/handoff`, {});
  return r.order;
}
