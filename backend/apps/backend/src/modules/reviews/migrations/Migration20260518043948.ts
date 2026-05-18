import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518043948 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_review" ("id" text not null, "product_id" text not null, "customer_id" text not null, "order_id" text null, "rating" integer not null, "title" text null, "body" text null, "images" jsonb null, "is_verified_purchase" boolean not null default false, "status" text check ("status" in ('pending', 'approved', 'rejected', 'hidden')) not null default 'approved', "helpful_count" integer not null default 0, "vendor_reply" text null, "vendor_reply_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_review_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_deleted_at" ON "product_review" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_product_id_status" ON "product_review" ("product_id", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_customer_id" ON "product_review" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_rating" ON "product_review" ("rating") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "shop_review" ("id" text not null, "tenant_id" text not null, "customer_id" text not null, "order_id" text null, "rating" integer not null, "delivery_rating" integer null, "packaging_rating" integer null, "accuracy_rating" integer null, "body" text null, "status" text check ("status" in ('pending', 'approved', 'rejected', 'hidden')) not null default 'approved', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shop_review_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shop_review_deleted_at" ON "shop_review" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shop_review_tenant_id" ON "shop_review" ("tenant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shop_review_customer_id" ON "shop_review" ("customer_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_review" cascade;`);

    this.addSql(`drop table if exists "shop_review" cascade;`);
  }

}
