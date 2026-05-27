// backend/apps/backend/src/modules/cash_session/migrations/Migration20260528000001.ts
import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260528000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS cash_session (
        id text PRIMARY KEY,
        vendor_id text NOT NULL,
        terminal_id text NOT NULL,
        cashier_id text NOT NULL,
        opening_float_minor numeric NOT NULL,
        raw_opening_float_minor jsonb,
        cash_sales_minor numeric NOT NULL DEFAULT 0,
        raw_cash_sales_minor jsonb,
        refunds_minor numeric NOT NULL DEFAULT 0,
        raw_refunds_minor jsonb,
        expected_total_minor numeric NOT NULL DEFAULT 0,
        raw_expected_total_minor jsonb,
        counted_total_minor numeric,
        raw_counted_total_minor jsonb,
        diff_minor numeric,
        raw_diff_minor jsonb,
        denomination_count jsonb,
        note text,
        status text NOT NULL DEFAULT 'open',
        opened_at timestamptz NOT NULL,
        closed_at timestamptz,
        currency_code text NOT NULL DEFAULT 'iqd',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_cs_vendor_status
        ON cash_session(vendor_id, status) WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_cs_open_per_terminal
        ON cash_session(terminal_id) WHERE status = 'open' AND deleted_at IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS cash_session;`);
  }
}
