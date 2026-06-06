import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260531130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS scan_cart (
        id text PRIMARY KEY,
        vendor_id text NOT NULL,
        staff_id text,
        short_code text,
        status text NOT NULL DEFAULT 'OPEN',
        locked_at timestamptz,
        expires_at timestamptz,
        paid_sale_id text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_sc_vendor_id
        ON scan_cart(vendor_id) WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sc_short_code
        ON scan_cart(short_code) WHERE deleted_at IS NULL AND short_code IS NOT NULL;

      CREATE TABLE IF NOT EXISTS scan_cart_line (
        id text PRIMARY KEY,
        cart_id text NOT NULL REFERENCES scan_cart(id),
        variant_id text NOT NULL,
        title text NOT NULL,
        qty integer NOT NULL DEFAULT 1,
        unit_price_minor numeric NOT NULL DEFAULT 0,
        raw_unit_price_minor jsonb,
        weigh_at_counter boolean NOT NULL DEFAULT false,
        priced boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_scl_cart_id
        ON scan_cart_line(cart_id) WHERE deleted_at IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS scan_cart_line;
      DROP TABLE IF EXISTS scan_cart;
    `);
  }
}
