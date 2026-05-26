import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260527000002 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE tenant
        ADD COLUMN IF NOT EXISTS commission_rate_bps integer DEFAULT 700,
        ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS onboarded_at timestamptz,
        ADD COLUMN IF NOT EXISTS industry text;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE tenant
        DROP COLUMN IF EXISTS commission_rate_bps,
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS onboarded_at,
        DROP COLUMN IF EXISTS industry;
    `);
  }
}
