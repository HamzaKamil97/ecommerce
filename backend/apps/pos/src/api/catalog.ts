import { apiGet, apiPost } from './client';

export type Product = {
  id: string;
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
    `/admin/products?vendor_id=${encodeURIComponent(vendorId)}&limit=500`,
  );
  return r.products ?? r.rows ?? [];
}

export async function listDepartments(tenantId: string): Promise<Department[]> {
  const r = await apiGet<any>(
    `/admin/departments?tenant_id=${encodeURIComponent(tenantId)}`,
  );
  return r.departments ?? r.rows ?? [];
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
};

export async function createProduct(input: CreateProductInput) {
  return apiPost('/admin/products', input);
}
