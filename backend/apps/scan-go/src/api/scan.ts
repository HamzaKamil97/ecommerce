import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { VENDOR_ID } from '../env';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BarcodeLookupResult =
  | {
      found: true;
      variant_id: string;
      title: string;
      price_minor: number;
      qty_available: number;
      weigh_at_counter: boolean;
      sellable: boolean;
    }
  | { found: false };

export type NameLookupMatch = {
  variant_id: string;
  title: string;
  price_minor: number;
  qty_available: number;
  weigh_at_counter: boolean;
  sellable: boolean;
};

export type ScanCart = {
  id: string;
  vendor_id: string;
  staff_id: string;
  status: string;
  short_code?: string | null;
  expires_at?: string | null;
  lines?: ScanCartLine[];
};

export type ScanCartLine = {
  id: string;
  variant_id: string;
  title: string;
  qty: number;
  unit_price_minor: number;
  weigh_at_counter: boolean;
};

export type CashierListItem = {
  id: string;
  vendor_id: string;
  name: string;
  role: 'cashier' | 'manager';
  active: boolean;
  pin_hash_prefix: string;
};

export type VerifyResult = {
  id: string;
  vendor_id: string;
  name: string;
  role: 'cashier' | 'manager';
  active: boolean;
};

// ---------------------------------------------------------------------------
// Catalog snapshot (admin route — uses dev-admin auth via client.ts)
// ---------------------------------------------------------------------------

export async function fetchCatalogSnapshot(vendorId: string = VENDOR_ID) {
  return apiGet<any>(
    `/admin/pos-terminal/catalog-snapshot?vendor_id=${encodeURIComponent(vendorId)}`,
  );
}

// ---------------------------------------------------------------------------
// Scan lookup
// ---------------------------------------------------------------------------

export async function lookupBarcode(
  barcode: string,
  vendorId: string = VENDOR_ID,
): Promise<BarcodeLookupResult> {
  return apiGet<BarcodeLookupResult>(
    `/pos/scan/lookup?vendor_id=${encodeURIComponent(vendorId)}&barcode=${encodeURIComponent(barcode)}`,
  );
}

export async function lookupName(
  q: string,
  vendorId: string = VENDOR_ID,
): Promise<NameLookupMatch[]> {
  const res = await apiGet<{ matches: NameLookupMatch[] }>(
    `/pos/scan/lookup?vendor_id=${encodeURIComponent(vendorId)}&q=${encodeURIComponent(q)}`,
  );
  return res.matches;
}

// ---------------------------------------------------------------------------
// Cart lifecycle
// ---------------------------------------------------------------------------

export async function createCart(
  staffId: string,
  vendorId: string = VENDOR_ID,
): Promise<ScanCart> {
  const res = await apiPost<{ cart: ScanCart }>('/pos/scan-carts', {
    vendor_id: vendorId,
    staff_id: staffId,
  });
  return res.cart;
}

export async function addLine(
  cartId: string,
  line: {
    variant_id: string;
    title: string;
    qty: number;
    unit_price_minor: number;
    weigh_at_counter?: boolean;
  },
): Promise<ScanCartLine> {
  const res = await apiPost<{ line: ScanCartLine }>(`/pos/scan-carts/${cartId}/lines`, line);
  return res.line;
}

export async function updateLine(
  cartId: string,
  lineId: string,
  patch: { qty?: number },
): Promise<ScanCartLine> {
  const res = await apiPatch<{ line: ScanCartLine }>(
    `/pos/scan-carts/${cartId}/lines/${lineId}`,
    patch,
  );
  return res.line;
}

export async function removeLine(cartId: string, lineId: string): Promise<void> {
  await apiDelete(`/pos/scan-carts/${cartId}/lines/${lineId}`);
}

export async function sendCart(cartId: string): Promise<ScanCart> {
  const res = await apiPost<{ cart: ScanCart }>(`/pos/scan-carts/${cartId}/send`);
  return res.cart;
}

export async function getByCode(code: string): Promise<ScanCart> {
  const res = await apiGet<{ cart: ScanCart }>(`/pos/scan-carts/by-code/${encodeURIComponent(code)}`);
  return res.cart;
}

// ---------------------------------------------------------------------------
// Staff PIN (mirrors POS pattern)
// ---------------------------------------------------------------------------

export async function fetchCashiers(vendorId: string = VENDOR_ID): Promise<CashierListItem[]> {
  const res = await apiGet<{ cashiers: CashierListItem[] }>(
    `/admin/pos-terminal/cashiers?vendor_id=${encodeURIComponent(vendorId)}`,
  );
  return res.cashiers;
}

export async function verifyCashierPin(cashier_id: string, pin: string): Promise<VerifyResult> {
  const res = await apiPost<{ cashier: VerifyResult }>('/admin/pos-terminal/cashiers/verify', {
    cashier_id,
    pin,
  });
  return res.cashier;
}
