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

export type FieldDef = {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'number' | 'price_minor' | 'select' | 'multi_select' | 'date' | 'boolean' | 'image';
  required?: boolean;
  options?: string[];
  unit?: string;
  help?: string;
};

export type CategoryDTO = { id: string; handle: string; name: string; icon: string | null; position: number };

export async function fetchCategories(): Promise<CategoryDTO[]> {
  const r = await api<{ categories: CategoryDTO[] }>('/admin/catalog-schema/categories');
  return r.categories;
}

export async function fetchSchema(handle: string): Promise<{ category_handle: string; fields: FieldDef[] }> {
  const r = await api<{ schema: { category_handle: string; fields: FieldDef[] } }>(
    `/admin/catalog-schema/schemas/${encodeURIComponent(handle)}`);
  return r.schema;
}

export type BarcodeLookupResult = {
  found: boolean; code: string;
  name?: string | null; brand?: string | null; image_url?: string | null;
  weight_grams?: number | null;
};

export async function barcodeLookup(code: string): Promise<BarcodeLookupResult> {
  return api<BarcodeLookupResult>(`/admin/catalog/barcode-lookup?code=${encodeURIComponent(code)}`);
}

export async function classifyName(name: string, hint?: string): Promise<{ category_handle: string; confidence: number }> {
  return api(`/admin/catalog/classify`, { method: 'POST', body: JSON.stringify({ name, hint }) });
}

export async function createProduct(body: {
  vendor_id: string; title: string; description?: string;
  barcode?: string; sku?: string; thumbnail?: string;
  price_minor: number; currency_code: string;
  category_handle: string; schema_fields?: Record<string, unknown>;
  initial_on_hand?: number;
}): Promise<{ product: any }> {
  return api('/admin/catalog/products', { method: 'POST', body: JSON.stringify(body) });
}

export async function importCsv(vendor_id: string, csv: string): Promise<{ total: number; created: number; failed: number; errors: Array<{ row: number; reason: string }> }> {
  return api(`/admin/catalog/import-csv?vendor_id=${encodeURIComponent(vendor_id)}`, {
    method: 'POST', body: csv, headers: { 'Content-Type': 'text/csv' },
  });
}
