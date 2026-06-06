import type { BarcodeLookupResult } from '../api/scan';

export type ScanDecision =
  | { action: 'add'; variant_id: string; title: string; price_minor: number; weigh_at_counter: boolean }
  | { action: 'reject'; reason: 'not_found' | 'out_of_stock' };

/**
 * Pure function: given a barcode lookup result, decide whether to add the
 * item to the cart or reject it.
 *
 * Rules:
 * - not found → reject(not_found)
 * - found but not sellable → reject(out_of_stock)
 * - found + sellable → add
 */
export function decideScan(result: BarcodeLookupResult): ScanDecision {
  if (!result.found) {
    return { action: 'reject', reason: 'not_found' };
  }
  if (!result.sellable) {
    return { action: 'reject', reason: 'out_of_stock' };
  }
  return {
    action: 'add',
    variant_id: result.variant_id,
    title: result.title,
    price_minor: result.price_minor,
    weigh_at_counter: result.weigh_at_counter,
  };
}
