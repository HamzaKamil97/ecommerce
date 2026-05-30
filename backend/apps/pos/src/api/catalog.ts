import { apiGet, apiPost } from './client';

export type Product = {
  id: string;
  variant_id?: string | null;
  title: string;
  sku?: string | null;
  barcode?: string | null;
  price_minor: number;
  currency_code: string;
  stock_qty?: number;
  merch_category_id?: string | null;
  thumb_emoji?: string | null;
};

export type Department = {
  id: string;
  handle: string;
  name: string;
  position: number;
  icon_url?: string | null;
  product_count?: number;
};

export async function listProducts(vendorId: string): Promise<Product[]> {
  const r = await apiGet<any>(
    `/admin/catalog/manager-products?vendor_id=${encodeURIComponent(vendorId)}`,
  );
  return r.products ?? [];
}

type MerchCategory = {
  id: string;
  handle: string;
  name: string;
  position: number;
  icon_url?: string | null;
};

export async function listDepartments(tenantId: string): Promise<Department[]> {
  const r = await apiGet<{ merch_categories?: MerchCategory[] }>(
    `/admin/tenants/${encodeURIComponent(tenantId)}/merch-categories`,
  );
  return (r.merch_categories ?? []).map((mc) => ({
    id: mc.id,
    handle: mc.handle,
    name: mc.name,
    position: mc.position,
    icon_url: mc.icon_url ?? null,
    // product_count omitted — not returned by the merch route.
  }));
}

export type CreateProductInput = {
  vendor_id: string;
  title: string;
  price_minor: number;
  currency_code: string;
  merch_category_id?: string | null;
  sku?: string | null;
  barcode?: string | null;
  initial_on_hand?: number | null;
  cost_price_minor?: number | null;
  brand?: string | null;
  supplier_name?: string | null;
  description?: string | null;
  tags?: string[];
  low_stock_threshold?: number | null;
  internal_notes?: string | null;
  schema_fields?: Record<string, any>;
  thumb_emoji?: string | null;
};

export async function createProduct(input: CreateProductInput) {
  return apiPost('/admin/catalog/manager-products', input);
}
