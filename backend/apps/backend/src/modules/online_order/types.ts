// backend/apps/backend/src/modules/online_order/types.ts
export type OnlineOrderStatus =
  | 'pending' | 'accepted' | 'rejected' | 'picking' | 'delivered' | 'cancelled' | 'refunded';

export type OnlineOrderLineInput = {
  variant_id: string; title: string; qty: number;
  unit_price_minor: number; line_total_minor: number;
  aisle_hint?: string | null;
};

export type CreateOnlineOrderInput = {
  vendor_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_minor: number;
  currency_code?: string;
  commission_rate_bps_snapshot: number;
  commission_minor: number;
  lines: OnlineOrderLineInput[];
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  voice_note_url?: string | null;
};
