import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518044002 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "wallet" drop constraint if exists "wallet_customer_id_currency_code_unique";`);
    this.addSql(`create table if not exists "wallet" ("id" text not null, "customer_id" text not null, "currency_code" text not null, "balance_cents" integer not null default 0, "is_frozen" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wallet_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wallet_deleted_at" ON "wallet" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wallet_customer_id_currency_code_unique" ON "wallet" ("customer_id", "currency_code") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "wallet_transaction" ("id" text not null, "wallet_id" text not null, "amount_cents" integer not null, "currency_code" text not null, "type" text check ("type" in ('topup', 'refund', 'purchase', 'promo_credit', 'referral_bonus', 'loyalty_redeem', 'manual_adjustment')) not null, "reference_type" text null, "reference_id" text null, "description" text null, "balance_after_cents" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wallet_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transaction_deleted_at" ON "wallet_transaction" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transaction_wallet_id" ON "wallet_transaction" ("wallet_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transaction_type" ON "wallet_transaction" ("type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transaction_reference_id" ON "wallet_transaction" ("reference_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wallet" cascade;`);

    this.addSql(`drop table if exists "wallet_transaction" cascade;`);
  }

}
