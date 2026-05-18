import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518201521 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "merch_category" drop constraint if exists "merch_category_tenant_id_handle_unique";`);
    this.addSql(`create table if not exists "merch_category" ("id" text not null, "tenant_id" text not null, "handle" text not null, "name" text not null, "position" integer not null default 0, "icon_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "merch_category_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merch_category_deleted_at" ON "merch_category" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_merch_category_tenant_id_handle_unique" ON "merch_category" ("tenant_id", "handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merch_category_tenant_id" ON "merch_category" ("tenant_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "merch_category" cascade;`);
  }

}
