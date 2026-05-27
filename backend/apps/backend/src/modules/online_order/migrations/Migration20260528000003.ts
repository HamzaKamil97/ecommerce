import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260528000003 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS online_order (
        id text PRIMARY KEY,
        vendor_id text NOT NULL,
        customer_id text, customer_name text, customer_phone text,
        total_minor numeric NOT NULL, raw_total_minor jsonb,
        currency_code text NOT NULL DEFAULT 'iqd',
        status text NOT NULL DEFAULT 'pending',
        commission_rate_bps_snapshot integer NOT NULL,
        commission_minor numeric NOT NULL, raw_commission_minor jsonb,
        payout_status text NOT NULL DEFAULT 'pending',
        channel text NOT NULL DEFAULT 'hanoot',
        delivery_address text, delivery_lat numeric, delivery_lng numeric,
        voice_note_url text,
        placed_at timestamptz NOT NULL,
        accepted_at timestamptz, rejected_at timestamptz, delivered_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_oo_vendor_status
        ON online_order(vendor_id, status) WHERE deleted_at IS NULL;

      CREATE TABLE IF NOT EXISTS online_order_line (
        id text PRIMARY KEY,
        order_id text NOT NULL REFERENCES online_order(id),
        variant_id text NOT NULL,
        title text NOT NULL,
        qty numeric NOT NULL,
        unit_price_minor numeric NOT NULL, raw_unit_price_minor jsonb,
        line_total_minor numeric NOT NULL, raw_line_total_minor jsonb,
        aisle_hint text,
        picked boolean NOT NULL DEFAULT false,
        oos boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_ool_order ON online_order_line(order_id) WHERE deleted_at IS NULL;
    `);
  }
  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS online_order_line; DROP TABLE IF EXISTS online_order;`);
  }
}
