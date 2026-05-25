import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260525000003 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "wms_reservation" (
      "id" text not null,
      "vendor_id" text not null,
      "order_id" text not null,
      "variant_id" text not null,
      "qty" numeric not null,
      "raw_qty" jsonb not null,
      "expires_at" timestamptz not null,
      "status" text not null default 'active',
      "consumed_at" timestamptz null,
      "released_at" timestamptz null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "wms_reservation_pkey" primary key ("id"),
      constraint "wms_reservation_status_check" check ("status" in ('active', 'consumed', 'released', 'expired'))
    );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_reservation_deleted_at" ON "wms_reservation" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_reservation_active_vendor_variant" ON "wms_reservation" ("vendor_id", "variant_id") WHERE deleted_at IS NULL AND status = 'active';`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_reservation_expires_active" ON "wms_reservation" ("expires_at") WHERE deleted_at IS NULL AND status = 'active';`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_reservation_order" ON "wms_reservation" ("order_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wms_reservation" cascade;`);
  }

}
