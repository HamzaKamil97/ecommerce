import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { bootstrapAdmin } from '../helpers/admin';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>;

    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer());
      adminHeaders = headers;
    });

    it('creates a pending refund request and lists it', async () => {
      const create = await api.post('/admin/approvals/refunds', {
        vendor_id: 'v_ar', original_sale_id: 'sale_1', total_minor: 3000, reason: 'damaged',
        requested_by: 'csh_1', requested_by_name: 'Hala',
        payload: { vendor_id: 'v_ar', cashier_id: 'csh_1', manager_id: '', terminal_id: 't1',
          original_sale_id: 'sale_1', method: 'cash', client_id: 'cl_1',
          lines: [{ original_sale_line_id: 'l1', variant_id: 'v1', qty: 1, unit_price_minor: 3000, reason: 'damaged' }] },
      }, { headers: adminHeaders }).catch((e: any) => e.response);
      expect(create.status).toBe(201);
      expect(create.data.approval.status).toBe('pending');
      expect(create.data.approval.id).toBeDefined();

      const list = await api.get('/admin/approvals/refunds?vendor_id=v_ar&status=pending', { headers: adminHeaders });
      expect(list.status).toBe(200);
      const a = list.data.approvals.find((x: any) => x.id === create.data.approval.id);
      expect(a).toMatchObject({ original_sale_id: 'sale_1', total_minor: 3000, reason: 'damaged', requested_by: 'csh_1', status: 'pending' });
    });

    it('400 when vendor_id missing on list', async () => {
      const r = await api.get('/admin/approvals/refunds', { headers: adminHeaders }).catch((e: any) => e.response);
      expect(r.status).toBe(400);
    });

    it('400 when required POST fields missing', async () => {
      const r = await api.post('/admin/approvals/refunds', { vendor_id: 'v_x' }, { headers: adminHeaders }).catch((e: any) => e.response);
      expect(r.status).toBe(400);
    });
  },
});
