import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530014003 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "pos_tag" drop constraint if exists "pos_tag_vendor_id_slug_unique";`);
    this.addSql(`create table if not exists "pos_tag" ("id" text not null, "vendor_id" text not null, "name" text not null, "slug" text not null, "featured" boolean not null default false, "position" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pos_tag_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_tag_deleted_at" ON "pos_tag" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pos_tag_vendor_id_slug_unique" ON "pos_tag" ("vendor_id", "slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_tag_vendor_id" ON "pos_tag" ("vendor_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pos_tag" cascade;`);
  }

}
