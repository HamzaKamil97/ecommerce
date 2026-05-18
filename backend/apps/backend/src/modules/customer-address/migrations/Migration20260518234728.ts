import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518234728 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "delivery_address" ("id" text not null, "customer_id" text not null, "label" text not null, "recipient_name" text not null, "phone" text not null, "country" text not null default 'IQ', "city" text not null, "area" text null, "street" text not null, "building" text null, "floor" text null, "notes" text null, "is_default" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "delivery_address_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_address_deleted_at" ON "delivery_address" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_address_customer_id" ON "delivery_address" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_address_customer_id_is_default" ON "delivery_address" ("customer_id", "is_default") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "delivery_address" cascade;`);
  }

}
