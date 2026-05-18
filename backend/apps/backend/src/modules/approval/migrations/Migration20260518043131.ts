import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518043131 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_approval" drop constraint if exists "product_approval_product_id_unique";`);
    this.addSql(`create table if not exists "approval_audit" ("id" text not null, "product_id" text not null, "actor_user_id" text null, "action" text check ("action" in ('product_created', 'submitted_for_review', 'approved', 'rejected', 'edited_after_rejection', 'resubmitted', 'overridden')) not null, "old_status" text null, "new_status" text null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "approval_audit_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_approval_audit_deleted_at" ON "approval_audit" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_approval_audit_product_id" ON "approval_audit" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_approval_audit_action" ON "approval_audit" ("action") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_approval" ("id" text not null, "product_id" text not null, "approval_status" text check ("approval_status" in ('draft', 'pending_review', 'approved', 'rejected')) not null default 'draft', "approval_note" text null, "submitted_by_vendor_id" text null, "approved_by_user_id" text null, "approved_at" timestamptz null, "rejected_by_user_id" text null, "rejected_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_approval_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_approval_deleted_at" ON "product_approval" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_approval_product_id_unique" ON "product_approval" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_approval_approval_status" ON "product_approval" ("approval_status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "approval_audit" cascade;`);

    this.addSql(`drop table if exists "product_approval" cascade;`);
  }

}
