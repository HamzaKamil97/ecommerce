import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260525000004 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "wms_shop_location" (
      "vendor_id" text not null,
      "lat" double precision not null,
      "lng" double precision not null,
      "delivery_radius_km" double precision not null default 5,
      "address_text" text null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "wms_shop_location_pkey" primary key ("vendor_id")
    );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_shop_location_deleted_at" ON "wms_shop_location" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_shop_location_lat_lng" ON "wms_shop_location" ("lat", "lng") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wms_shop_location" cascade;`);
  }

}
