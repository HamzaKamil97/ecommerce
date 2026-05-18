import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518043142 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_embedding" drop constraint if exists "product_embedding_product_id_model_name_unique";`);
    this.addSql(`create table if not exists "product_embedding" ("id" text not null, "product_id" text not null, "model_name" text not null, "dim" integer not null, "embedding" jsonb not null, "source_text" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_embedding_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_embedding_deleted_at" ON "product_embedding" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_embedding_product_id_model_name_unique" ON "product_embedding" ("product_id", "model_name") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_embedding" cascade;`);
  }

}
