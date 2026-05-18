import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518043136 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor" drop constraint if exists "vendor_user_id_tenant_id_unique";`);
    this.addSql(`alter table if exists "tenant" drop constraint if exists "tenant_domain_unique";`);
    this.addSql(`alter table if exists "tenant" drop constraint if exists "tenant_slug_unique";`);
    this.addSql(`create table if not exists "tenant" ("id" text not null, "slug" text not null, "name" text not null, "sales_channel_id" text null, "vertical" text check ("vertical" in ('food', 'flowers', 'vegetables', 'electronics', 'fashion', 'general')) not null default 'general', "plan" text check ("plan" in ('marketplace', 'dedicated')) not null default 'marketplace', "domain" text null, "branding" jsonb null, "approval_status" text check ("approval_status" in ('pending', 'approved', 'suspended')) not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tenant_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tenant_deleted_at" ON "tenant" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_slug_unique" ON "tenant" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tenant_sales_channel_id" ON "tenant" ("sales_channel_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_domain_unique" ON "tenant" ("domain") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "vendor" ("id" text not null, "user_id" text not null, "tenant_id" text not null, "role" text check ("role" in ('owner', 'manager', 'staff')) not null default 'owner', "email" text not null, "display_name" text null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_deleted_at" ON "vendor" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vendor_user_id_tenant_id_unique" ON "vendor" ("user_id", "tenant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_tenant_id" ON "vendor" ("tenant_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "tenant" cascade;`);

    this.addSql(`drop table if exists "vendor" cascade;`);
  }

}
