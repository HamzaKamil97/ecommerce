import { Migration } from '@medusajs/framework/mikro-orm/migrations';
import { DEFAULT_CATEGORIES } from '../seeds';
import { randomUUID } from 'crypto';

export class Migration20260526100001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS catalog_schema_category (
        id text PRIMARY KEY,
        handle text NOT NULL,
        name text NOT NULL,
        icon text,
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_catalog_schema_category_handle
        ON catalog_schema_category(handle) WHERE deleted_at IS NULL;

      CREATE TABLE IF NOT EXISTS catalog_schema_schema (
        id text PRIMARY KEY,
        category_handle text NOT NULL,
        fields_json jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_catalog_schema_schema_handle
        ON catalog_schema_schema(category_handle) WHERE deleted_at IS NULL;
    `);

    for (const c of DEFAULT_CATEGORIES) {
      const catId = `csc_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const schId = `css_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
      this.addSql(
        `INSERT INTO catalog_schema_category (id, handle, name, icon, position)
         VALUES ('${catId}', '${c.handle}', '${c.name.replace(/'/g, "''")}',
                 ${c.icon ? `'${c.icon}'` : 'NULL'}, ${c.position})
         ON CONFLICT (handle) WHERE deleted_at IS NULL DO NOTHING;`,
      );
      const fieldsJson = JSON.stringify(c.fields).replace(/'/g, "''");
      this.addSql(
        `INSERT INTO catalog_schema_schema (id, category_handle, fields_json)
         VALUES ('${schId}', '${c.handle}', '${fieldsJson}'::jsonb)
         ON CONFLICT (category_handle) WHERE deleted_at IS NULL DO NOTHING;`,
      );
    }
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS catalog_schema_schema;`);
    this.addSql(`DROP TABLE IF EXISTS catalog_schema_category;`);
  }
}
