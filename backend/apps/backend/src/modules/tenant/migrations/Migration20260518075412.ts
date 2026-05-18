import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518075412 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tenant" add column if not exists "display_currency" text check ("display_currency" in ('IQD', 'USD')) not null default 'IQD', add column if not exists "show_secondary" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tenant" drop column if exists "display_currency", drop column if exists "show_secondary";`);
  }

}
