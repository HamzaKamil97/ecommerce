import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260526000001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "pos_sale" (
        "id" text not null,
        "vendor_id" text not null,
        "cashier_id" text not null,
        "terminal_id" text not null,
        "client_id" text not null,
        "total_minor" numeric not null,
        "raw_total_minor" jsonb not null,
        "paid_amount_minor" numeric not null,
        "raw_paid_amount_minor" jsonb not null,
        "change_due_minor" numeric not null,
        "raw_change_due_minor" jsonb not null,
        "currency_code" text not null,
        "status" text not null default 'completed',
        "voided_at" timestamptz null,
        "client_created_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "pos_sale_pkey" primary key ("id"),
        constraint "pos_sale_status_check" check ("status" in ('completed', 'voided'))
      );
    `);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "pos_sale_client_id_uq" ON "pos_sale" ("client_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_sale_vendor_id" ON "pos_sale" ("vendor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_sale_deleted_at" ON "pos_sale" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`
      create table if not exists "pos_sale_line" (
        "id" text not null,
        "sale_id" text not null,
        "variant_id" text not null,
        "qty" numeric not null,
        "raw_qty" jsonb not null,
        "unit_price_minor" numeric not null,
        "raw_unit_price_minor" jsonb not null,
        "name_snapshot" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "pos_sale_line_pkey" primary key ("id"),
        constraint "pos_sale_line_sale_fk" foreign key ("sale_id") references "pos_sale"("id") on delete cascade
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_sale_line_sale_id" ON "pos_sale_line" ("sale_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_sale_line_variant_id" ON "pos_sale_line" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_sale_line_deleted_at" ON "pos_sale_line" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pos_sale_line" cascade;`);
    this.addSql(`drop table if exists "pos_sale" cascade;`);
  }

}
