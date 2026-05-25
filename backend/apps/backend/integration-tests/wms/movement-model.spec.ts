import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('Movement model', () => {
      it('stores a movement row with required columns', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        const created = await svc.createMovements({
          vendor_id: 'v_a',
          variant_id: 'var_x',
          type: 'sale',
          qty_delta: -1,
          source_id: 'order_1',
          actor_id: 'cashier_42',
        });
        expect(created).toBeDefined();
        expect(created.id).toMatch(/^mv_/);
        expect(created.type).toBe('sale');
        const delta = created.qty_delta?.numeric ?? created.qty_delta;
        expect(Number(delta)).toBe(-1);

        const rows = await svc.listMovements({ id: created.id });
        expect(rows.length).toBe(1);
      });

      it('rejects invalid type via DB check constraint', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await expect(svc.createMovements({
          vendor_id: 'v_a', variant_id: 'var_x',
          type: 'not_a_valid_type',
          qty_delta: 1,
        })).rejects.toThrow();
      });
    });
  },
});
