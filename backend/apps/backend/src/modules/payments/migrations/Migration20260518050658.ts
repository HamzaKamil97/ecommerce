import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518050658 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "payment_attempt" ("id" text not null, "order_id" text null, "cart_id" text null, "customer_id" text null, "provider" text check ("provider" in ('manual', 'zaincash', 'qicard', 'asiapay', 'stripe')) not null, "provider_ref" text null, "amount_cents" integer not null, "currency_code" text not null, "status" text check ("status" in ('initiated', 'pending_user_action', 'succeeded', 'failed', 'refunded', 'expired')) not null default 'initiated', "error" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payment_attempt_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_attempt_deleted_at" ON "payment_attempt" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_attempt_order_id" ON "payment_attempt" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_attempt_cart_id" ON "payment_attempt" ("cart_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_attempt_provider_provider_ref" ON "payment_attempt" ("provider", "provider_ref") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_attempt_status" ON "payment_attempt" ("status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payment_attempt" cascade;`);
  }

}
