import { Migration } from "@medusajs/framework/mikro-orm/migrations"

// Drop the vertical-fields tables — taxonomy is now the canonical source of product metadata schemas.
export class Migration20260519000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "vertical_product_fields" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "vertical_product_field_template" CASCADE;`)
  }

  override async down(): Promise<void> {
    // No-op — bringing this back requires the original migration files.
  }
}
