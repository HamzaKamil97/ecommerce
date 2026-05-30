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

    it('does not store the raw pin in audit after_json (cashier create)', async () => {
      const create = await api.post('/admin/pos-terminal/cashiers',
        { vendor_id: 'v_audit_pin', name: 'Redact', pin: '7777', role: 'cashier' },
        { headers: adminHeaders });
      expect(create.status).toBe(200);
      // small wait for the fire-and-forget audit write on res finish
      await new Promise((r) => setTimeout(r, 500));
      const log = await api.get('/admin/audit-log?vendor_id=v_audit_pin', { headers: adminHeaders });
      // GET /admin/audit-log returns { rows, total, limit, offset }
      const rows = log.data.rows ?? log.data.entries ?? [];
      const row = rows.find((r: any) => JSON.stringify(r.after_json ?? {}).includes('Redact'));
      expect(row).toBeTruthy();                       // the create audit row exists
      const json = JSON.stringify(row.after_json);
      expect(json).not.toContain('7777');             // raw pin is gone
      expect(json).toContain('[REDACTED]');           // redaction marker present
      expect(json).toContain('Redact');               // non-sensitive field (name) preserved
    });
  },
});
