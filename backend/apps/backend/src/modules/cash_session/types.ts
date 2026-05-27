// backend/apps/backend/src/modules/cash_session/types.ts
export type CashSessionStatus = 'open' | 'closed';

export type OpenSessionInput = {
  vendor_id: string;
  terminal_id: string;
  cashier_id: string;
  opening_float_minor: number;
  currency_code?: string;
};

export type CloseSessionInput = {
  session_id: string;
  cashier_id: string;
  counted_total_minor: number;
  denomination_count: Record<string, number>;  // {"50000":3,"25000":0,...}
  note?: string | null;
};

export type CashSessionRow = {
  id: string;
  vendor_id: string;
  terminal_id: string;
  cashier_id: string;
  opening_float_minor: number;
  cash_sales_minor: number;
  refunds_minor: number;
  expected_total_minor: number;
  counted_total_minor: number | null;
  diff_minor: number | null;
  denomination_count: Record<string, number> | null;
  note: string | null;
  status: CashSessionStatus;
  opened_at: Date;
  closed_at: Date | null;
  currency_code: string;
};
