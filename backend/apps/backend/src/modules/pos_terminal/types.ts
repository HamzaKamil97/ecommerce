export type RecordSaleLineInput = {
  variant_id: string;
  qty: number;
  unit_price_minor: number;
  name_snapshot: string;
};

export type RecordSaleInput = {
  client_id: string;
  vendor_id: string;
  cashier_id: string;
  terminal_id: string;
  lines: RecordSaleLineInput[];
  paid_amount_minor: number;
  currency_code: string;
  client_created_at: string;
};

export type RecordSaleResult = {
  sale_id: string;
  total_minor: number;
  change_due_minor: number;
  stock_after: Array<{ variant_id: string; on_hand: number; available: number }>;
};

export type CreateCashierInput = {
  vendor_id: string;
  name: string;
  pin: string;
  role: 'cashier' | 'manager';
};

export type CashierDTO = {
  id: string;
  vendor_id: string;
  name: string;
  role: 'cashier' | 'manager';
  active: boolean;
};

export type RefundReason =
  | 'damaged' | 'expired' | 'changed_mind' | 'wrong_item' | 'quality_issue' | 'other';

export type ProcessReturnLine = {
  original_sale_line_id: string;
  variant_id: string;
  qty: number;
  unit_price_minor: number;
  reason: RefundReason;
};

export type ProcessReturnInput = {
  vendor_id: string;
  cashier_id: string;
  manager_id: string;          // who approved the PIN
  terminal_id: string;
  original_sale_id: string;
  lines: ProcessReturnLine[];
  method: 'cash' | 'store_credit';
  client_id: string;
};

export type ProcessReturnResult = {
  refund_sale_id: string;
  refund_total_minor: number;
  stock_damaged_units: number;
  stock_returned_units: number;
};

export interface PosTerminalServiceInterface {
  ping(): string;
  recordSale(input: RecordSaleInput): Promise<RecordSaleResult>;
  createCashier(input: CreateCashierInput): Promise<CashierDTO>;
  listCashiers(vendorId: string): Promise<Array<CashierDTO & { pin_hash_prefix: string }>>;
  verifyCashierPin(cashierId: string, pin: string): Promise<CashierDTO>;
  processReturn(input: ProcessReturnInput): Promise<ProcessReturnResult>;
}
