import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260527000004 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;
      CREATE INDEX IF NOT EXISTS idx_user_super_admin ON "user"(is_super_admin) WHERE is_super_admin = true;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "user" DROP COLUMN IF EXISTS is_super_admin;`);
  }
}
