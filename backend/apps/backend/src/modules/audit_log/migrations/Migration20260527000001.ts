// backend/apps/backend/src/modules/audit_log/migrations/Migration20260527000001.ts
import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260527000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS platform_audit_log (
        id text PRIMARY KEY,
        vendor_id text,
        actor_id text,
        actor_type text NOT NULL,
        module text NOT NULL,
        action text NOT NULL,
        entity_id text,
        before_json jsonb,
        after_json jsonb,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_audit_vendor_created
        ON platform_audit_log(vendor_id, created_at DESC)
        WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_audit_module_action
        ON platform_audit_log(module, action)
        WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_audit_entity
        ON platform_audit_log(entity_id)
        WHERE deleted_at IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS platform_audit_log;`);
  }
}
