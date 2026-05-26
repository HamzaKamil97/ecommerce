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
  },
});
