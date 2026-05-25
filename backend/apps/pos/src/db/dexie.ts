import Dexie, { Table } from 'dexie';

export interface CatalogRow {
  variant_id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  price_minor: number;
  currency_code: string;
  image_url: string | null;
  on_hand: number;
  updated_at: string;
}

export interface PendingSaleRow {
  client_id: string;
  vendor_id: string;
  cashier_id: string;
  terminal_id: string;
  lines: Array<{ variant_id: string; qty: number; unit_price_minor: number; name_snapshot: string }>;
  paid_amount_minor: number;
  currency_code: string;
  client_created_at: string;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  attempts: number;
  last_error: string | null;
}

export interface CashierRow {
  id: string;
  vendor_id: string;
  name: string;
  role: 'cashier' | 'manager';
  pin_hash_prefix: string;
}

export interface ConfigRow {
  key: string;
  value: unknown;
}

class PosDb extends Dexie {
  catalog!: Table<CatalogRow, string>;
  sales_pending!: Table<PendingSaleRow, string>;
  cashiers!: Table<CashierRow, string>;
  config!: Table<ConfigRow, string>;

  constructor() {
    super('hanoot-pos');
    this.version(1).stores({
      catalog: 'variant_id, barcode, sku, product_id',
      sales_pending: 'client_id, status, vendor_id',
      cashiers: 'id, vendor_id',
      config: 'key',
    });
  }
}

export const db = new PosDb();

export async function resetDbForTests() {
  await db.catalog.clear();
  await db.sales_pending.clear();
  await db.cashiers.clear();
  await db.config.clear();
}
