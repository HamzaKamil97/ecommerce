import { apiPost } from './client';

export type RefundReason =
  | 'damaged'
  | 'expired'
  | 'changed_mind'
  | 'wrong_item'
  | 'quality_issue'
  | 'other';

export type RefundLine = {
  original_sale_line_id: string;
  variant_id: string;
  qty: number;
  unit_price_minor: number;
  reason: RefundReason;
};

export type RefundResult = {
  refund_sale_id: string;
  refund_total_minor: number;
  stock_damaged_units: number;
  stock_returned_units: number;
};

export async function processRefund(p: {
  vendor_id: string;
  cashier_id: string;
  manager_id: string;
  manager_pin: string; // pulled out from headers - caller doesn't see header detail
  terminal_id: string;
  original_sale_id: string;
  lines: RefundLine[];
  method: 'cash' | 'store_credit';
  client_id: string;
}): Promise<RefundResult> {
  const r = await apiPost<{ refund: RefundResult }>(
    '/pos/refunds',
    {
      vendor_id: p.vendor_id,
      cashier_id: p.cashier_id,
      manager_id: p.manager_id,
      terminal_id: p.terminal_id,
      original_sale_id: p.original_sale_id,
      lines: p.lines,
      method: p.method,
      client_id: p.client_id,
    },
    {
      // The cashier acting is the cashier; PIN re-prompt is provided by manager
      // verifying via x-pin-confirm. Permission middleware checks BOTH headers.
      headers: { 'x-cashier-id': p.cashier_id, 'x-pin-confirm': p.manager_pin },
    },
  );
  return r.refund;
}
