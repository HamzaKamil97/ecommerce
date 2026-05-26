import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { createUserAccountWorkflow } from '@medusajs/core-flows';
import { DEFAULT_CATEGORIES } from '../../src/modules/catalog_schema/seeds';

async function bootstrapAdmin(api: any, container: any) {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
  const password = 'supersecret1';
  const registerRes = await api
    .post(`/auth/user/emailpass/register`, { email, password })
    .catch((e: any) => e.response);
  const [, payloadB64] = (registerRes.data.token as string).split('.');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
  await createUserAccountWorkflow(container).run({
    input: { authIdentityId: payload.auth_identity_id, userData: { email, first_name: 'T', last_name: 'A' } },
  });
  const loginRes = await api.post(`/auth/user/emailpass`, { email, password });
  return { headers: { Authorization: `Bearer ${loginRes.data.token}` } };
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>;
    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer());
      adminHeaders = headers;
      // Idempotent seed: HTTP runner truncates tables between tests but doesn't re-run migrations
      const svc: any = getContainer().resolve('catalogSchemaService');
      const existing = await svc.listCategories();
      if (existing.length === 0) {
        for (const c of DEFAULT_CATEGORIES) {
          await svc.createCategories({
            handle: c.handle, name: c.name, icon: c.icon, position: c.position,
          });
          await svc.createSchemata({
            category_handle: c.handle, fields_json: c.fields,
          });
        }
      }
    });

    it('GET /admin/catalog-schema/categories returns seeded categories', async () => {
      const r = await api.get('/admin/catalog-schema/categories', { headers: adminHeaders });
      expect(r.status).toBe(200);
      const handles = r.data.categories.map((c: any) => c.handle);
      expect(handles).toContain('grocery');
      expect(handles).toContain('clothes');
    });

    it('GET /admin/catalog-schema/schemas/grocery returns weight_grams field', async () => {
      const r = await api.get('/admin/catalog-schema/schemas/grocery', { headers: adminHeaders });
      expect(r.status).toBe(200);
      const keys = r.data.schema.fields.map((f: any) => f.key);
      expect(keys).toContain('weight_grams');
    });

    it('GET /admin/catalog-schema/schemas/nope returns 404', async () => {
      const r = await api.get('/admin/catalog-schema/schemas/nope', { headers: adminHeaders })
        .catch((e: any) => e.response);
      expect(r.status).toBe(404);
    });
  },
});
