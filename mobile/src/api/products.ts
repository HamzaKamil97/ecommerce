import { medusaClient } from './medusaClient';
import { Product } from '../types/product';

export interface ListProductsParams {
  q?: string;
  category_id?: string[];
  limit?: number;
  offset?: number;
}

export interface VerticalFieldSchema {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  help?: string;
}

export interface VerticalFields {
  vertical: string | null;
  fields: Record<string, any> | null;
  template: { vertical: string; label: string; emoji: string; fields: VerticalFieldSchema[] } | null;
}

export async function listProducts(params: ListProductsParams = {}): Promise<Product[]> {
  const { data } = await medusaClient.get('/store/products', { params });
  return data?.products ?? [];
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data } = await medusaClient.get(`/store/products/${id}`);
  return data?.product ?? null;
}

export async function getProductVerticalFields(id: string): Promise<VerticalFields> {
  const { data } = await medusaClient.get(`/store/products/${id}/vertical-fields`);
  return data ?? { vertical: null, fields: null, template: null };
}

export async function listCategories() {
  const { data } = await medusaClient.get('/store/product-categories');
  return data?.product_categories ?? [];
}
