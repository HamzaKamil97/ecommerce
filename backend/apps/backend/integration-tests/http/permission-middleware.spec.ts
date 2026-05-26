import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { createUserAccountWorkflow } from '@medusajs/core-flows';

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

    it('test capability resolver works end-to-end via the service', async () => {
      const svc: any = getContainer().resolve('posTerminalService');
      const mgr = await svc.createCashier({ vendor_id: 'v_perm', name: 'M', pin: '0000', role: 'manager' });
      expect(mgr.role).toBe('manager');

      const { ContainerRegistrationKeys } = await import('@medusajs/framework/utils');
      const pg: any = (getContainer() as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
      await pg.raw(`UPDATE pos_cashier SET permission_overrides = '{"pos.refund_or_void":false}'::jsonb WHERE id = ?`, [mgr.id]);

      const [rows] = await svc.listAndCountCashiers({ id: mgr.id });
      expect(rows[0].permission_overrides).toEqual({ 'pos.refund_or_void': false });

      const { resolveCapability } = await import('../../src/permissions/capabilities.js');
      expect(resolveCapability('manager', 'pos.refund_or_void', rows[0].permission_overrides)).toBe(false);
      expect(resolveCapability('manager', 'pos.ring_sales', rows[0].permission_overrides)).toBe(true);
    });
  },
});
