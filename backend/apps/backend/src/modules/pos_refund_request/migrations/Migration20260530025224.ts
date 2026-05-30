import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530025224 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "pos_refund_request" ("id" text not null, "vendor_id" text not null, "original_sale_id" text not null, "total_minor" integer not null, "reason" text not null, "requested_by" text not null, "requested_by_name" text null, "status" text not null default 'pending', "payload" jsonb not null, "approved_by" text null, "approved_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pos_refund_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_refund_request_deleted_at" ON "pos_refund_request" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_refund_request_vendor_id_status" ON "pos_refund_request" ("vendor_id", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_refund_request_vendor_id" ON "pos_refund_request" ("vendor_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pos_refund_request" cascade;`);
  }

}
