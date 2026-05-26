import { moduleIntegrationTestRunner } from '@medusajs/test-utils';
import { CATALOG_SCHEMA_MODULE } from '..';
import { Category } from '../models/category.model';
import { Schema } from '../models/schema.model';
import { DEFAULT_CATEGORIES } from '../seeds';
import path from 'path';

moduleIntegrationTestRunner({
  moduleName: CATALOG_SCHEMA_MODULE,
  moduleModels: [Category, Schema],
  resolve: path.join(__dirname, '..'),
  hooks: {
    afterModuleInit: async (_medusaApp, svc: any) => {
      // Seed the 6 verticals after each test's module init
      // (MikroOrmWrapper clears the DB between tests; migrations don't re-run)
      for (const c of DEFAULT_CATEGORIES) {
        await svc.createCategories({
          handle: c.handle,
          name: c.name,
          icon: c.icon,
          position: c.position,
        });
        await svc.createSchemata({
          category_handle: c.handle,
          fields_json: c.fields,
        });
      }
    },
  },
  testSuite: ({ service }) => {
    describe('CatalogSchemaService', () => {
      it('ping returns ok', () => {
        expect(service.ping()).toBe('catalog-schema-ok');
      });

      it('listCategories returns the 6 seeded verticals in position order', async () => {
        const cats = await service.listCategories();
        expect(cats.map((c: any) => c.handle)).toEqual(
          ['grocery', 'clothes', 'pharmacy', 'salon', 'restaurant', 'other'],
        );
      });

      it('getSchemaByHandle("grocery") returns weight + expiry fields', async () => {
        const s = await service.getSchemaByHandle('grocery');
        expect(s).not.toBeNull();
        const keys = (s!.fields as any[]).map((f) => f.key);
        expect(keys).toContain('weight_grams');
        expect(keys).toContain('expiry_date');
      });

      it('getSchemaByHandle("nope") returns null', async () => {
        const s = await service.getSchemaByHandle('nope');
        expect(s).toBeNull();
      });
    });
  },
});
