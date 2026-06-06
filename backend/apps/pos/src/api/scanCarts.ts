import { apiGet, apiPost } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScanCartLine = {
  id: string;
  variant_id: string;
  title: string;
  qty: number;
  unit_price_minor: number;
  weigh_at_counter: boolean;
  priced: boolean;
};

export type ScanCart = {
  id: string;
  vendor_id: string;
  status: string;
  short_code: string;
  expires_at: string;
  lines: ScanCartLine[];
};

export type CollectPayload = {
  cashier_id: string;
  terminal_id: string;
  priced_lines: Array<{ line_id: string; unit_price_minor: number }>;
  paid_amount_minor: number;
};

export type CollectResult = {
  cart: { status: 'PAID'; paid_sale_id: string };
  sale: { sale_id: string; total_minor: number; change_due_minor: number };
};

// ─── Pure helper ──────────────────────────────────────────────────────────────

/**
 * Builds the `priced_lines` array required by the collect endpoint.
 * Only weigh-at-counter lines are included (non-weigh lines are priced on the
 * server from the catalog variant price).
 * Throws `Error('weigh line <id> needs a price')` if any weigh line has no
 * entry in `priceByLineId`.
 */
export function buildPricedLines(
  lines: Array<{ id: string; weigh_at_counter: boolean; priced?: boolean }>,
  priceByLineId: Record<string, number>,
): Array<{ line_id: string; unit_price_minor: number }> {
  const result: Array<{ line_id: string; unit_price_minor: number }> = [];
  for (const line of lines) {
    if (!line.weigh_at_counter) continue;
    const price = priceByLineId[line.id];
    if (price === undefined || price === null) {
      throw new Error(`weigh line ${line.id} needs a price`);
    }
    result.push({ line_id: line.id, unit_price_minor: price });
  }
  return result;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** Load a scan-go cart by its short code (e.g. "K74Q2"). Throws ApiError on 404/410. */
export async function loadByCode(code: string): Promise<ScanCart> {
  const r = await apiGet<{ cart: ScanCart }>(
    `/pos/scan-carts/by-code/${encodeURIComponent(code)}`,
  );
  return r.cart;
}

/** Collect cash and close the cart (decrements WMS stock). */
export async function collect(cartId: string, payload: CollectPayload): Promise<CollectResult> {
  return apiPost<CollectResult>(`/pos/scan-carts/${cartId}/collect`, payload);
}
