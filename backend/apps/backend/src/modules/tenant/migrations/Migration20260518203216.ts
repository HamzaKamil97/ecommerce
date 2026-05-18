import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518203216 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tenant" drop constraint if exists "tenant_vertical_check";`);

    this.addSql(`alter table if exists "tenant" add constraint "tenant_vertical_check" check("vertical" in ('food', 'grocery', 'home', 'fashion', 'electronics', 'general'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tenant" drop constraint if exists "tenant_vertical_check";`);

    this.addSql(`alter table if exists "tenant" add constraint "tenant_vertical_check" check("vertical" in ('food', 'flowers', 'vegetables', 'electronics', 'fashion', 'general'));`);
  }

}
