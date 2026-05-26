import { MedusaService } from '@medusajs/framework/utils';
import { Category } from './models/category.model';
import { Schema } from './models/schema.model';
import { CatalogSchemaServiceInterface, CategoryDTO, FieldDef, SchemaDTO } from './types';

class CatalogSchemaServiceBase extends MedusaService({ Category, Schema }) {}

export class CatalogSchemaService extends CatalogSchemaServiceBase
  implements CatalogSchemaServiceInterface {

  ping(): string { return 'catalog-schema-ok'; }

  async listCategories(): Promise<CategoryDTO[]> {
    const [rows] = await (this as any).listAndCountCategories(
      {}, { order: { position: 'ASC' } },
    );
    return rows.map((r: any) => ({
      id: r.id, handle: r.handle, name: r.name, icon: r.icon, position: r.position,
    }));
  }

  async getSchemaByHandle(handle: string): Promise<SchemaDTO | null> {
    const [rows] = await (this as any).listAndCountSchemas({ category_handle: handle });
    if (!rows.length) return null;
    const r = rows[0];
    return {
      category_handle: r.category_handle,
      fields: r.fields_json as FieldDef[],
      updated_at: r.updated_at?.toISOString?.() ?? new Date().toISOString(),
    };
  }
}

export default CatalogSchemaService;
