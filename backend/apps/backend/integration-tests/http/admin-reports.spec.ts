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

    async function seedSale(vendor: string, variant: string, qty: number, price: number) {
      const wms: any = getContainer().resolve('wmsService');
      await wms.incrementStock({ vendor_id: vendor, variant_id: variant, qty, type: 'restock' });
      const svc: any = getContainer().resolve('posTerminalService');
      const cashier = await svc.createCashier({ vendor_id: vendor, name: 'C', pin: '1', role: 'cashier' });
      await svc.recordSale({
        client_id: `cli_${vendor}_${variant}_${Date.now()}_${Math.random()}`,
        vendor_id: vendor, cashier_id: cashier.id, terminal_id: 't',
        lines: [{ variant_id: variant, qty, unit_price_minor: price, name_snapshot: variant }],
        paid_amount_minor: qty * price, currency_code: 'iqd',
        client_created_at: new Date().toISOString(),
      });
    }

    describe('GET /admin/reports/sales-summary', () => {
      it('returns daily buckets summing to vendor revenue', async () => {
        await seedSale('v_rep', 'var_a', 2, 1000);
        await seedSale('v_rep', 'var_b', 1, 500);
        const r = await api.get('/admin/reports/sales-summary?vendor_id=v_rep', { headers: adminHeaders });
        expect(r.status).toBe(200);
        const total = r.data.buckets.reduce((s: number, b: any) => s + b.revenue_minor, 0);
        expect(total).toBe(2500);
      });

      it('400 when vendor_id missing', async () => {
        const r = await api.get('/admin/reports/sales-summary', { headers: adminHeaders })
          .catch((e: any) => e.response);
        expect(r.status).toBe(400);
      });
    });

    describe('GET /admin/reports/top-skus', () => {
      it('orders by revenue desc', async () => {
        await seedSale('v_top', 'big',   3, 5000); // 15000
        await seedSale('v_top', 'small', 5, 1000); //  5000
        const r = await api.get('/admin/reports/top-skus?vendor_id=v_top&limit=10',
          { headers: adminHeaders });
        expect(r.status).toBe(200);
        expect(r.data.items[0].variant_id).toBe('big');
        expect(r.data.items[1].variant_id).toBe('small');
      });
    });

    describe('GET /admin/reports/drift-alerts', () => {
      it('wraps wms.detectStockDrift', async () => {
        const r = await api.get('/admin/reports/drift-alerts?vendor_id=v_drift',
          { headers: adminHeaders });
        expect(r.status).toBe(200);
        expect(Array.isArray(r.data.flagged)).toBe(true);
      });
    });

    describe('GET /admin/reports/low-stock', () => {
      it('lists pools at or below threshold', async () => {
        const wms: any = getContainer().resolve('wmsService');
        await wms.incrementStock({ vendor_id: 'v_low', variant_id: 'low_a', qty: 2, type: 'restock' });
        await wms.incrementStock({ vendor_id: 'v_low', variant_id: 'low_b', qty: 100, type: 'restock' });
        const r = await api.get('/admin/reports/low-stock?vendor_id=v_low&threshold=5',
          { headers: adminHeaders });
        expect(r.status).toBe(200);
        const ids = r.data.items.map((i: any) => i.variant_id);
        expect(ids).toContain('low_a');
        expect(ids).not.toContain('low_b');
      });
    });
  },
});
