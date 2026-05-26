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

    it('POST to admin route writes one audit row', async () => {
      const svc: any = getContainer().resolve('auditLogService');
      const before = await svc.listAuditByVendor('v_audit_test');

      // Use the existing POST /admin/pos-terminal/cashiers as the trigger
      const r = await api.post(
        '/admin/pos-terminal/cashiers',
        { vendor_id: 'v_audit_test', name: 'AuditTester', pin: '0000', role: 'cashier' },
        { headers: adminHeaders },
      );
      expect(r.status).toBe(200);

      // Allow the res.on('finish') hook to flush
      await new Promise((r) => setTimeout(r, 200));

      const after = await svc.listAuditByVendor('v_audit_test');
      expect(after.length).toBe(before.length + 1);

      const row = after[0];
      expect(row.module).toBe('pos-terminal');
      expect(row.action).toBe('create');
      expect(row.vendor_id).toBe('v_audit_test');
    });

    it('GET requests do not write audit rows', async () => {
      const svc: any = getContainer().resolve('auditLogService');
      const before = await svc.listAuditByVendor('v_audit_test_get');
      await api.get('/admin/pos-terminal/cashiers?vendor_id=v_audit_test_get', { headers: adminHeaders });
      await new Promise((r) => setTimeout(r, 100));
      const after = await svc.listAuditByVendor('v_audit_test_get');
      expect(after.length).toBe(before.length);
    });
  },
});
