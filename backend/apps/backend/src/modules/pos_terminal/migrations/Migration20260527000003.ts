import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260527000003 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE pos_cashier
        ADD COLUMN IF NOT EXISTS permission_overrides jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE pos_sale
        ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'offline';
      CREATE INDEX IF NOT EXISTS idx_pos_sale_channel ON pos_sale(channel) WHERE deleted_at IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE pos_cashier DROP COLUMN IF EXISTS permission_overrides;
      ALTER TABLE pos_sale DROP COLUMN IF EXISTS channel;
    `);
  }
}
