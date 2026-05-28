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

    it('sets a capability override and resolveCapability reflects it', async () => {
      const pos: any = getContainer().resolve('posTerminalService');
      const cashier = await pos.createCashier({
        vendor_id: 'v_caps_test', name: 'Ahmed', pin: '1234', role: 'cashier',
      });

      const beforeR = await api.get(`/admin/staff/${cashier.id}`, { headers: adminHeaders });
      expect(beforeR.data.cashier.permission_overrides ?? {}).toEqual({});

      const setR = await api.put(
        `/admin/staff/${cashier.id}/capabilities`,
        { key: 'pos.refund_or_void', value: true },
        { headers: adminHeaders },
      );
      expect(setR.status).toBe(200);
      expect(setR.data.cashier.permission_overrides['pos.refund_or_void']).toBe(true);

      const { resolveCapability } = await import('../../src/permissions/capabilities.js');
      const updated = await pos.retrieveCashier(cashier.id);
      expect(
        resolveCapability(updated.role, 'pos.refund_or_void', updated.permission_overrides ?? {}),
      ).toBe(true);
    });

    it('clears an override by setting value=null', async () => {
      const pos: any = getContainer().resolve('posTerminalService');
      const cashier = await pos.createCashier({
        vendor_id: 'v_clr', name: 'Hala', pin: '4321', role: 'cashier',
      });
      await api.put(
        `/admin/staff/${cashier.id}/capabilities`,
        { key: 'pos.refund_or_void', value: true },
        { headers: adminHeaders },
      );
      const clearR = await api.put(
        `/admin/staff/${cashier.id}/capabilities`,
        { key: 'pos.refund_or_void', value: null },
        { headers: adminHeaders },
      );
      expect(clearR.status).toBe(200);
      expect(clearR.data.cashier.permission_overrides['pos.refund_or_void']).toBeUndefined();
    });

    it('rejects an unknown capability key', async () => {
      const pos: any = getContainer().resolve('posTerminalService');
      const cashier = await pos.createCashier({
        vendor_id: 'v_rej', name: 'X', pin: '1111', role: 'cashier',
      });
      const r = await api.put(
        `/admin/staff/${cashier.id}/capabilities`,
        { key: 'made.up.key', value: true },
        { headers: adminHeaders },
      ).catch((e: any) => e.response);
      expect(r.status).toBe(400);
      expect(r.data.error).toMatch(/unknown capability/i);
    });
  },
});
