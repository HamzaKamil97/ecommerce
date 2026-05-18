import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518043125 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "sku_mapping" drop constraint if exists "sku_mapping_medusa_variant_id_pos_provider_unique";`);
    this.addSql(`alter table if exists "order_export_log" drop constraint if exists "order_export_log_medusa_order_id_pos_provider_unique";`);
    this.addSql(`create table if not exists "inventory_sync_log" ("id" text not null, "source" text check ("source" in ('medusa', 'pos')) not null, "pos_provider" text not null, "sku" text not null, "medusa_variant_id" text null, "old_quantity" integer null, "new_quantity" integer not null, "status" text check ("status" in ('success', 'failed', 'retry')) not null, "error_message" text null, "attempts" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "inventory_sync_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_inventory_sync_log_deleted_at" ON "inventory_sync_log" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_inventory_sync_log_sku_pos_provider" ON "inventory_sync_log" ("sku", "pos_provider") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_inventory_sync_log_status" ON "inventory_sync_log" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "order_export_log" ("id" text not null, "medusa_order_id" text not null, "pos_provider" text not null, "pos_order_id" text null, "status" text check ("status" in ('pending', 'success', 'failed')) not null, "error_message" text null, "attempts" integer not null default 0, "last_attempt_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_export_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_export_log_deleted_at" ON "order_export_log" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_export_log_medusa_order_id_pos_provider_unique" ON "order_export_log" ("medusa_order_id", "pos_provider") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_export_log_status" ON "order_export_log" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "sku_mapping" ("id" text not null, "medusa_variant_id" text not null, "sku" text not null, "pos_provider" text not null, "pos_product_id" text null, "pos_variant_id" text null, "last_synced_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "sku_mapping_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sku_mapping_deleted_at" ON "sku_mapping" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_sku_mapping_medusa_variant_id_pos_provider_unique" ON "sku_mapping" ("medusa_variant_id", "pos_provider") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sku_mapping_sku_pos_provider" ON "sku_mapping" ("sku", "pos_provider") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "inventory_sync_log" cascade;`);

    this.addSql(`drop table if exists "order_export_log" cascade;`);

    this.addSql(`drop table if exists "sku_mapping" cascade;`);
  }

}
