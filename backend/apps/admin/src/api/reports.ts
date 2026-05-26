import { api } from './client';

export type SalesBucket = { bucket_at: string; sale_count: number; revenue_minor: number };
export type SalesSummary = { vendor_id: string; from: string; to: string; bucket: string; buckets: SalesBucket[] };

export async function fetchSalesSummary(vendor_id: string, from: Date, to: Date, bucket: 'day' | 'hour' | 'week') {
  const q = `vendor_id=${encodeURIComponent(vendor_id)}&from=${from.toISOString()}&to=${to.toISOString()}&bucket=${bucket}`;
  return api<SalesSummary>(`/admin/reports/sales-summary?${q}`);
}

export type TopSku = { variant_id: string; name_snapshot: string; units_sold: number; revenue_minor: number; sale_count: number };
export async function fetchTopSkus(vendor_id: string, limit = 20) {
  return api<{ vendor_id: string; items: TopSku[] }>(`/admin/reports/top-skus?vendor_id=${encodeURIComponent(vendor_id)}&limit=${limit}`);
}

export type DriftItem = { vendor_id: string; variant_id: string; on_hand: number; reserved: number; flag: string };
export async function fetchDriftAlerts(vendor_id: string) {
  return api<{ flagged: DriftItem[] }>(`/admin/reports/drift-alerts?vendor_id=${encodeURIComponent(vendor_id)}`);
}

export type LowStockItem = { variant_id: string; on_hand: number; reserved: number; available: number };
export async function fetchLowStock(vendor_id: string, threshold = 5) {
  return api<{ vendor_id: string; threshold: number; items: LowStockItem[] }>(`/admin/reports/low-stock?vendor_id=${encodeURIComponent(vendor_id)}&threshold=${threshold}`);
}
