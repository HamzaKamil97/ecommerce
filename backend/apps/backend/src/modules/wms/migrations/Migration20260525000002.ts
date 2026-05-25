import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260525000002 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "wms_movement" (
      "id" text not null,
      "vendor_id" text not null,
      "variant_id" text not null,
      "type" text not null,
      "qty_delta" numeric not null,
      "raw_qty_delta" jsonb not null,
      "source_id" text null,
      "actor_id" text null,
      "note" text null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "wms_movement_pkey" primary key ("id"),
      constraint "wms_movement_type_check" check ("type" in ('sale', 'pick', 'manual', 'restock', 'adjustment', 'release'))
    );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_movement_deleted_at" ON "wms_movement" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_movement_vendor_created" ON "wms_movement" ("vendor_id", "created_at" DESC) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_movement_vendor_variant_created" ON "wms_movement" ("vendor_id", "variant_id", "created_at" DESC) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wms_movement" cascade;`);
  }

}
