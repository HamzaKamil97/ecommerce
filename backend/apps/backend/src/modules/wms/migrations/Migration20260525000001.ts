import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260525000001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "wms_stock_pool" (
      "id" text not null,
      "vendor_id" text not null,
      "variant_id" text not null,
      "on_hand_qty" numeric not null default 0,
      "raw_on_hand_qty" jsonb not null,
      "reserved_qty" numeric not null default 0,
      "raw_reserved_qty" jsonb not null,
      "last_movement_at" timestamptz null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "wms_stock_pool_pkey" primary key ("id")
    );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_stock_pool_deleted_at" ON "wms_stock_pool" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "uniq_pool_per_vendor_variant" ON "wms_stock_pool" ("vendor_id", "variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_stock_pool_vendor_id" ON "wms_stock_pool" ("vendor_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wms_stock_pool" cascade;`);
  }

}
