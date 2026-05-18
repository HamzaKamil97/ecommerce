import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518044008 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "referral" drop constraint if exists "referral_referred_customer_id_unique";`);
    this.addSql(`alter table if exists "loyalty_account" drop constraint if exists "loyalty_account_referral_code_unique";`);
    this.addSql(`alter table if exists "loyalty_account" drop constraint if exists "loyalty_account_customer_id_unique";`);
    this.addSql(`create table if not exists "loyalty_account" ("id" text not null, "customer_id" text not null, "points_balance" integer not null default 0, "lifetime_points" integer not null default 0, "tier" text check ("tier" in ('bronze', 'silver', 'gold', 'platinum')) not null default 'bronze', "referral_code" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "loyalty_account_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_account_deleted_at" ON "loyalty_account" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_loyalty_account_customer_id_unique" ON "loyalty_account" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_loyalty_account_referral_code_unique" ON "loyalty_account" ("referral_code") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "loyalty_event" ("id" text not null, "loyalty_account_id" text not null, "delta" integer not null, "reason" text check ("reason" in ('order_completed', 'referral_signup', 'referral_first_order', 'redeem', 'manual_adjustment', 'tier_promotion', 'promo')) not null, "reference_type" text null, "reference_id" text null, "description" text null, "balance_after" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "loyalty_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_event_deleted_at" ON "loyalty_event" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_event_loyalty_account_id" ON "loyalty_event" ("loyalty_account_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_event_reason" ON "loyalty_event" ("reason") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "referral" ("id" text not null, "referrer_customer_id" text not null, "referred_customer_id" text not null, "referral_code" text not null, "status" text check ("status" in ('pending_first_order', 'fulfilled', 'expired')) not null default 'pending_first_order', "bonus_paid_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "referral_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_referral_deleted_at" ON "referral" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_referral_referrer_customer_id" ON "referral" ("referrer_customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_referral_referred_customer_id_unique" ON "referral" ("referred_customer_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "loyalty_account" cascade;`);

    this.addSql(`drop table if exists "loyalty_event" cascade;`);

    this.addSql(`drop table if exists "referral" cascade;`);
  }

}
