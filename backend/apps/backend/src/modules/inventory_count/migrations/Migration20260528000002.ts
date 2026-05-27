// backend/apps/backend/src/modules/inventory_count/migrations/Migration20260528000002.ts
import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260528000002 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS inventory_count_session (
        id text PRIMARY KEY,
        vendor_id text NOT NULL,
        actor_id text NOT NULL,
        scope text NOT NULL,
        status text NOT NULL DEFAULT 'in_progress',
        expected_total numeric,
        counted_total numeric,
        delta_total numeric,
        note text,
        applied_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_ics_vendor_status
        ON inventory_count_session(vendor_id, status) WHERE deleted_at IS NULL;

      CREATE TABLE IF NOT EXISTS inventory_count_line (
        id text PRIMARY KEY,
        session_id text NOT NULL REFERENCES inventory_count_session(id),
        variant_id text NOT NULL,
        system_qty numeric NOT NULL,
        actual_qty numeric NOT NULL,
        delta numeric NOT NULL,
        reason text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_icl_session ON inventory_count_line(session_id) WHERE deleted_at IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS inventory_count_line; DROP TABLE IF EXISTS inventory_count_session;`);
  }
}
