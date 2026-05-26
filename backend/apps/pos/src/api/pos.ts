import { api } from './client';

export type CatalogSnapshot = {
  vendor_id: string;
  generated_at: string;
  items: Array<{
    variant_id: string; product_id: string; sku: string | null; barcode: string | null;
    name: string; price_minor: number; currency_code: string;
    image_url: string | null; on_hand: number;
  }>;
};

export async function fetchCatalogSnapshot(vendorId: string): Promise<CatalogSnapshot> {
  return api<CatalogSnapshot>(`/admin/pos-terminal/catalog-snapshot?vendor_id=${encodeURIComponent(vendorId)}`);
}

export type CashierListItem = {
  id: string; vendor_id: string; name: string;
  role: 'cashier' | 'manager'; active: boolean; pin_hash_prefix: string;
};

export async function fetchCashiers(vendorId: string): Promise<CashierListItem[]> {
  const r = await api<{ cashiers: CashierListItem[] }>(
    `/admin/pos-terminal/cashiers?vendor_id=${encodeURIComponent(vendorId)}`,
  );
  return r.cashiers;
}

export type RecordSalePayload = {
  client_id: string; vendor_id: string; cashier_id: string; terminal_id: string;
  lines: Array<{ variant_id: string; qty: number; unit_price_minor: number; name_snapshot: string }>;
  paid_amount_minor: number; currency_code: string; client_created_at: string;
};

export async function postSale(p: RecordSalePayload) {
  return api<{ sale: { sale_id: string; total_minor: number; change_due_minor: number; stock_after: Array<{ variant_id: string; on_hand: number; available: number }> } }>(
    '/admin/pos-terminal/sales', { method: 'POST', body: JSON.stringify(p) },
  );
}

export type VerifyResult = {
  id: string; vendor_id: string; name: string;
  role: 'cashier' | 'manager'; active: boolean;
};

export async function verifyCashierPin(cashier_id: string, pin: string): Promise<VerifyResult> {
  const r = await api<{ cashier: VerifyResult }>('/admin/pos-terminal/cashiers/verify', {
    method: 'POST', body: JSON.stringify({ cashier_id, pin }),
  });
  return r.cashier;
}
