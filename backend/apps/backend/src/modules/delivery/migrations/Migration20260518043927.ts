import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518043927 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "delivery_slot" ("id" text not null, "tenant_id" text not null, "window_id" text not null, "cart_id" text null, "order_id" text null, "slot_start" timestamptz not null, "slot_end" timestamptz not null, "status" text check ("status" in ('held', 'confirmed', 'released', 'delivered', 'missed')) not null default 'held', "held_until" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "delivery_slot_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_slot_deleted_at" ON "delivery_slot" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_slot_tenant_id_slot_start" ON "delivery_slot" ("tenant_id", "slot_start") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_slot_cart_id" ON "delivery_slot" ("cart_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_slot_order_id" ON "delivery_slot" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_slot_status" ON "delivery_slot" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "delivery_window" ("id" text not null, "tenant_id" text not null, "day_of_week" integer not null, "start_minutes" integer not null, "end_minutes" integer not null, "capacity" integer not null default 20, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "delivery_window_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_window_deleted_at" ON "delivery_window" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_window_tenant_id_day_of_week" ON "delivery_window" ("tenant_id", "day_of_week") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "delivery_zone" ("id" text not null, "tenant_id" text not null, "name" text not null, "polygon" jsonb null, "postcodes" jsonb null, "center_lat" integer null, "center_lng" integer null, "radius_km" integer null, "delivery_fee_cents" integer not null default 0, "min_order_cents" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "delivery_zone_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_zone_deleted_at" ON "delivery_zone" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_zone_tenant_id" ON "delivery_zone" ("tenant_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "delivery_slot" cascade;`);

    this.addSql(`drop table if exists "delivery_window" cascade;`);

    this.addSql(`drop table if exists "delivery_zone" cascade;`);
  }

}
