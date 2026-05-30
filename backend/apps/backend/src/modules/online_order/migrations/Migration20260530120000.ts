import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260530120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE online_order
        ADD COLUMN IF NOT EXISTS medusa_order_id text,
        ADD COLUMN IF NOT EXISTS display_id text;
      CREATE INDEX IF NOT EXISTS "IDX_online_order_medusa_order_id"
        ON online_order (medusa_order_id) WHERE deleted_at IS NULL;
    `);
  }
  override async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS "IDX_online_order_medusa_order_id";
      ALTER TABLE online_order
        DROP COLUMN IF EXISTS medusa_order_id,
        DROP COLUMN IF EXISTS display_id;
    `);
  }
}
