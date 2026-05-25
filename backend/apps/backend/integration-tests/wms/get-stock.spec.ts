import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.getStock', () => {
      it('returns 0/0/0 when no pool row exists', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        const result = await svc.getStock('v_none', 'var_none');
        expect(result.on_hand).toBe(0);
        expect(result.reserved).toBe(0);
        expect(result.available).toBe(0);
      });

      it('returns on_hand, reserved, available = on_hand - reserved when pool exists', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.createStockPools({
          vendor_id: 'v_t3', variant_id: 'var_t3',
          on_hand_qty: 100, reserved_qty: 15,
        });
        const result = await svc.getStock('v_t3', 'var_t3');
        expect(result.on_hand).toBe(100);
        expect(result.reserved).toBe(15);
        expect(result.available).toBe(85);
      });
    });
  },
});
