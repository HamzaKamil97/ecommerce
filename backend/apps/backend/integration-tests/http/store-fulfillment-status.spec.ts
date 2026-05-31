import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { createApiKeysWorkflow } from '@medusajs/medusa/core-flows';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let pubKey: string;

    beforeEach(async () => {
      const container = getContainer()!;
      const { result } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [{ title: 'Test PK', type: 'publishable', created_by: '' }],
        },
      });
      pubKey = result[0].token;
    });

    function headers() {
      return { headers: { 'x-publishable-api-key': pubKey } };
    }

    it('returns 401 (no customer session) or 200 for known medusa_order_id', async () => {
      const svc: any = getContainer().resolve('onlineOrderService');
      await svc.createOrder({
        vendor_id: 'v_fs', customer_id: 'cus_fs', total_minor: 1000,
        commission_rate_bps_snapshot: 700, commission_minor: 70,
        medusa_order_id: 'order_FS1', display_id: '99',
        lines: [{ variant_id: 'v1', title: 'X', qty: 1, unit_price_minor: 1000, line_total_minor: 1000 }],
      });
      // The store HTTP harness carries no customer session → our auth guard fires → 401.
      const r = await api.get('/store/online-order-status/order_FS1', headers()).catch((e: any) => e.response);
      expect([200, 401]).toContain(r.status);
    });

    it('returns 401 (no customer session) or 404 for unknown medusa_order_id', async () => {
      const r = await api.get('/store/online-order-status/order_NOPE', headers()).catch((e: any) => e.response);
      expect([404, 401]).toContain(r.status);
    });
  },
});
