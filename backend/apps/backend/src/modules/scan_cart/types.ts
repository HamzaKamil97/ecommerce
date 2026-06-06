export type ScanCartStatus = 'OPEN' | 'PENDING_CASHIER' | 'PAID' | 'EXPIRED' | 'VOID';
export type AddLineInput = {
  variant_id: string;
  title: string;
  qty: number;
  unit_price_minor: number;
  weigh_at_counter?: boolean;
};
