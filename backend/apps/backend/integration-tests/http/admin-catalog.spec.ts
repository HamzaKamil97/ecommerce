import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { createUserAccountWorkflow } from '@medusajs/core-flows';
import { DEFAULT_CATEGORIES } from '../../src/modules/catalog_schema/seeds';

async function bootstrapAdmin(api: any, container: any) {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
  const password = 'supersecret1';
  const r = await api.post(`/auth/user/emailpass/register`, { email, password })
    .catch((e: any) => e.response);
  const [, p64] = (r.data.token as string).split('.');
  const payload = JSON.parse(Buffer.from(p64, 'base64url').toString('utf-8'));
  await createUserAccountWorkflow(container).run({
    input: { authIdentityId: payload.auth_identity_id, userData: { email, first_name: 'T', last_name: 'A' } },
  });
  const login = await api.post(`/auth/user/emailpass`, { email, password });
  return { headers: { Authorization: `Bearer ${login.data.token}` } };
}

async function seedCatalogSchema(container: any) {
  const svc: any = container.resolve('catalogSchemaService');
  const existing = await svc.listCategories();
  if (existing.length > 0) return;
  for (const c of DEFAULT_CATEGORIES) {
    await (svc as any).createCategories({
      handle: c.handle, name: c.name, icon: c.icon, position: c.position,
    });
    await (svc as any).createSchemata({
      category_handle: c.handle, fields_json: c.fields,
    });
  }
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>;
    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer());
      adminHeaders = headers;
      await seedCatalogSchema(getContainer());
    });

    describe('POST /admin/catalog/classify', () => {
      it('400 when name missing', async () => {
        const r = await api.post('/admin/catalog/classify', {}, { headers: adminHeaders })
          .catch((e: any) => e.response);
        expect(r.status).toBe(400);
      });

      it('returns { category_handle, confidence } shape (other / 0 without key)', async () => {
        delete process.env.OPENAI_API_KEY;
        const r = await api.post('/admin/catalog/classify',
          { name: 'Lurpak Butter 200g' }, { headers: adminHeaders });
        expect(r.status).toBe(200);
        expect(typeof r.data.category_handle).toBe('string');
        expect(typeof r.data.confidence).toBe('number');
      });
    });

    describe('GET /admin/catalog/barcode-lookup', () => {
      it('400 when code missing', async () => {
        const r = await api.get('/admin/catalog/barcode-lookup', { headers: adminHeaders })
          .catch((e: any) => e.response);
        expect(r.status).toBe(400);
      });

      it('returns { found: false } gracefully when upstream returns no product', async () => {
        const r = await api.get('/admin/catalog/barcode-lookup?code=0000000000000',
          { headers: adminHeaders });
        expect(r.status).toBe(200);
        expect(r.data.found).toBe(false);
      });
    });

    describe('POST /admin/catalog/products', () => {
      it('creates product with metadata.created_by_vendor_id + category_handle + schema_fields', async () => {
        const body = {
          vendor_id: 'v_h3',
          title: 'Lurpak Butter 200g',
          barcode: '5740900401099',
          sku: 'LRPK-200',
          price_minor: 4500,
          currency_code: 'iqd',
          category_handle: 'grocery',
          schema_fields: { weight_grams: 200, brand: 'Lurpak' },
          initial_on_hand: 12,
        };
        const r = await api.post('/admin/catalog/products', body, { headers: adminHeaders });
        expect(r.status).toBe(201);
        expect(r.data.product.id).toBeDefined();
        expect(r.data.product.metadata.created_by_vendor_id).toBe('v_h3');
        expect(r.data.product.metadata.category_handle).toBe('grocery');
        expect(r.data.product.metadata.schema_fields.weight_grams).toBe(200);
        const wms: any = getContainer().resolve('wmsService');
        const variantId = r.data.product.variants[0].id;
        const snap = await wms.getStock('v_h3', variantId);
        expect(snap.on_hand).toBe(12);
      });

      it('400 when required fields missing', async () => {
        const r = await api.post('/admin/catalog/products', { title: 'x' }, { headers: adminHeaders })
          .catch((e: any) => e.response);
        expect(r.status).toBe(400);
      });
    });

    describe('POST /admin/catalog/import-csv', () => {
      it('imports a 3-row CSV and returns per-row results', async () => {
        const csv =
          'title,sku,barcode,price_minor,currency_code,category_handle,initial_on_hand\n' +
          'Bread,BRD-1,1111111111111,1000,iqd,grocery,5\n' +
          'Milk,MLK-1,2222222222222,2500,iqd,grocery,10\n' +
          'Notebook,NTB-1,3333333333333,1500,iqd,other,3\n';
        const r = await api.post(
          '/admin/catalog/import-csv?vendor_id=v_csv',
          csv,
          { headers: { ...adminHeaders, 'Content-Type': 'text/csv' } },
        );
        expect(r.status).toBe(200);
        expect(r.data.total).toBe(3);
        expect(r.data.created).toBe(3);
        expect(r.data.failed).toBe(0);
      });

      it('returns per-row errors but keeps going', async () => {
        const csv =
          'title,sku,barcode,price_minor,currency_code,category_handle,initial_on_hand\n' +
          ',MISSING-TITLE,4,100,iqd,grocery,0\n' +
          'Valid,VAL-1,5555555555555,1000,iqd,grocery,2\n';
        const r = await api.post(
          '/admin/catalog/import-csv?vendor_id=v_csv2',
          csv,
          { headers: { ...adminHeaders, 'Content-Type': 'text/csv' } },
        );
        expect(r.status).toBe(200);
        expect(r.data.created).toBe(1);
        expect(r.data.failed).toBe(1);
        expect(r.data.errors[0]).toMatchObject({ row: 1 });
      });
    });
  },
});
