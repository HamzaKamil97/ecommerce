import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518043148 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vertical_product_fields" drop constraint if exists "vertical_product_fields_product_id_unique";`);
    this.addSql(`create table if not exists "vertical_product_fields" ("id" text not null, "product_id" text not null, "vertical" text check ("vertical" in ('food', 'grocery', 'vegetables', 'flowers', 'electronics', 'fashion', 'pharmacy', 'pets', 'beauty', 'general')) not null, "fields" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vertical_product_fields_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vertical_product_fields_deleted_at" ON "vertical_product_fields" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vertical_product_fields_product_id_unique" ON "vertical_product_fields" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vertical_product_fields_vertical" ON "vertical_product_fields" ("vertical") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vertical_product_fields" cascade;`);
  }

}
