import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260526000002 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "pos_cashier" (
        "id" text NOT NULL PRIMARY KEY,
        "vendor_id" text NOT NULL,
        "name" text NOT NULL,
        "pin_hash" text NOT NULL,
        "pin_salt" text NOT NULL,
        "role" text NOT NULL DEFAULT 'cashier',
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        "deleted_at" timestamptz NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_pos_cashier_vendor_id"
        ON "pos_cashier" ("vendor_id") WHERE deleted_at IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "pos_cashier";`);
  }

}
