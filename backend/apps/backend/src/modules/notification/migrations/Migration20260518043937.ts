import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518043937 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "push_token" drop constraint if exists "push_token_token_unique";`);
    this.addSql(`create table if not exists "notification_record" ("id" text not null, "user_id" text not null, "channel" text check ("channel" in ('push', 'email', 'sms', 'in_app')) not null, "template" text not null, "title" text not null, "body" text not null, "data" jsonb null, "read_at" timestamptz null, "delivered_at" timestamptz null, "delivery_status" text check ("delivery_status" in ('pending', 'sent', 'delivered', 'failed', 'read')) not null default 'pending', "error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "notification_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notification_record_deleted_at" ON "notification_record" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notification_record_user_id_channel" ON "notification_record" ("user_id", "channel") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notification_record_delivery_status" ON "notification_record" ("delivery_status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "push_token" ("id" text not null, "user_id" text not null, "user_type" text check ("user_type" in ('customer', 'vendor', 'driver')) not null default 'customer', "token" text not null, "platform" text check ("platform" in ('ios', 'android', 'web', 'expo')) not null default 'expo', "device_name" text null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "push_token_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_push_token_deleted_at" ON "push_token" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_push_token_user_id" ON "push_token" ("user_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_token_token_unique" ON "push_token" ("token") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "notification_record" cascade;`);

    this.addSql(`drop table if exists "push_token" cascade;`);
  }

}
