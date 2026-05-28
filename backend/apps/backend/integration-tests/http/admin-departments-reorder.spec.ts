import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { createUserAccountWorkflow } from '@medusajs/core-flows';

// Duplicated bootstrapAdmin helper from admin-staff-capabilities.spec.ts
// (commit 633c92f). Extraction into a shared file is a separate follow-up.
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

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>;
    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer());
      adminHeaders = headers;
    });

    it('reorders departments inside a single tenant', async () => {
      // The merch module registers under its module name 'merch'
      // (see backend/apps/backend/src/modules/merch/index.ts MERCH_MODULE).
      const merch: any = getContainer().resolve('merch');
      const a = await merch.createMerchCategories({ tenant_id: 't_re', handle: 'a', name: 'A', position: 0 });
      const b = await merch.createMerchCategories({ tenant_id: 't_re', handle: 'b', name: 'B', position: 1 });
      const c = await merch.createMerchCategories({ tenant_id: 't_re', handle: 'c', name: 'C', position: 2 });
      const ids = [a, b, c].map((r: any) => Array.isArray(r) ? r[0].id : r.id);

      const r = await api.put('/admin/departments/reorder', {
        tenant_id: 't_re',
        order: [ { id: ids[2], position: 0 }, { id: ids[0], position: 1 }, { id: ids[1], position: 2 } ],
      }, { headers: adminHeaders });
      expect(r.status).toBe(200);
      expect(r.data.updated).toBe(3);

      const [rows] = await merch.listAndCountMerchCategories({ tenant_id: 't_re' }, { order: { position: 'ASC' } });
      expect(rows.map((x: any) => x.id)).toEqual([ids[2], ids[0], ids[1]]);
    });

    it('rejects when an id belongs to a different tenant', async () => {
      const merch: any = getContainer().resolve('merch');
      const a = await merch.createMerchCategories({ tenant_id: 't_one', handle: 'a', name: 'A', position: 0 });
      const x = await merch.createMerchCategories({ tenant_id: 't_other', handle: 'x', name: 'X', position: 0 });
      const aId = Array.isArray(a) ? a[0].id : a.id;
      const xId = Array.isArray(x) ? x[0].id : x.id;
      const r = await api.put('/admin/departments/reorder', {
        tenant_id: 't_one',
        order: [ { id: aId, position: 0 }, { id: xId, position: 1 } ],
      }, { headers: adminHeaders }).catch((e: any) => e.response);
      expect(r.status).toBe(400);
      expect(r.data.error).toMatch(/tenant/i);
    });
  },
});
