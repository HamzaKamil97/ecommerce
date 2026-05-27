import { apiGet } from './client';

export type SaleLine = {
  id: string;
  variant_id: string;
  title: string;
  qty: number;
  unit_price_minor: number;
};

export type Sale = {
  id: string;
  lines: SaleLine[];
};

/**
 * Fetch a sale by id for refund flows.
 *
 * TODO: backend does not yet expose `/pos/sales/:id` for the cashier surface
 * (only admin reports + the refund POST endpoint exist as of H-3.2b-C5).
 * For now this tries an admin-side route and falls back to a stub so the
 * end-to-end refund UI flow remains usable during phone-walk + smoke runs.
 * When the cashier-side sale lookup route lands this stub goes away.
 */
export async function fetchSale(id: string): Promise<Sale> {
  try {
    const r = await apiGet<{ sale: Sale | null }>(`/admin/pos-terminal/sales/${id}`);
    if (r?.sale) return r.sale;
  } catch {
    // fall through to stub
  }
  return {
    id,
    lines: [
      { id: 'sl1', variant_id: 'v_rice', title: 'Basmati Rice 5kg · Tilda', qty: 1, unit_price_minor: 22000 },
      { id: 'sl2', variant_id: 'v_yogurt', title: 'Yogurt 500g · Sara', qty: 2, unit_price_minor: 2000 },
      { id: 'sl3', variant_id: 'v_coke', title: 'Coca-Cola 1L', qty: 2, unit_price_minor: 1750 },
    ],
  };
}

export type RecentSale = {
  id: string;
  placed_at: string;
  total_minor: number;
  preview: string;
  method: 'cash' | 'card' | 'store_credit';
};

export async function fetchRecentSales(): Promise<RecentSale[]> {
  // Stub until /pos/sales recent endpoint exists.
  return [];
}
