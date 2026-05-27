// backend/apps/backend/src/modules/inventory_count/types.ts
export type CountStatus = 'in_progress' | 'applied' | 'cancelled';
export type CountReason = 'damaged' | 'theft' | 'miscount' | 'received_late' | 'expired' | 'other';

export type OpenCountInput = {
  vendor_id: string;
  actor_id: string;
  scope: string; // 'all' | 'department:<id>' | 'product:<ids>'
};

export type AddCountLineInput = {
  session_id: string;
  variant_id: string;
  system_qty: number;
  actual_qty: number;
  reason?: CountReason | null;
};

export type ApplyCountInput = {
  session_id: string;
  actor_id: string;
};
