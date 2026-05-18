import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518051939 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "promo_code" drop constraint if exists "promo_code_code_unique";`);
    this.addSql(`create table if not exists "promo_code" ("id" text not null, "code" text not null, "description" text null, "tenant_id" text null, "discount_type" text check ("discount_type" in ('percent', 'fixed_amount', 'free_shipping')) not null, "percent_off" integer null, "amount_off_cents" integer null, "currency_code" text null, "min_subtotal_cents" integer null, "max_redemptions" integer null, "redemptions_count" integer not null default 0, "valid_from" timestamptz null, "valid_until" timestamptz null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "promo_code_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_promo_code_deleted_at" ON "promo_code" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_promo_code_code_unique" ON "promo_code" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_promo_code_tenant_id" ON "promo_code" ("tenant_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "promo_redemption" ("id" text not null, "promo_code_id" text not null, "customer_id" text not null, "order_id" text null, "discount_applied_cents" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "promo_redemption_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_promo_redemption_deleted_at" ON "promo_redemption" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_promo_redemption_promo_code_id" ON "promo_redemption" ("promo_code_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_promo_redemption_customer_id" ON "promo_redemption" ("customer_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "promo_code" cascade;`);

    this.addSql(`drop table if exists "promo_redemption" cascade;`);
  }

}
