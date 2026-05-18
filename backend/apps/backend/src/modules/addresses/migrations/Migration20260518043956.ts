import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518043956 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "saved_address" ("id" text not null, "customer_id" text not null, "label" text null, "recipient_name" text null, "phone" text null, "street" text not null, "building" text null, "apartment" text null, "city" text not null, "region" text null, "postcode" text null, "country_code" text not null, "lat" integer null, "lng" integer null, "delivery_instructions" text null, "is_default" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "saved_address_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_saved_address_deleted_at" ON "saved_address" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_saved_address_customer_id_is_default" ON "saved_address" ("customer_id", "is_default") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "saved_address" cascade;`);
  }

}
