import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('StockPool model', () => {
      it('persists a stock pool row with vendor_id + variant_id unique constraint', async () => {
        const container = getContainer();
        const svc = container.resolve('wmsService') as any;
        const created = await svc.createStockPools({
          vendor_id: 'vendor_a',
          variant_id: 'variant_x',
          on_hand_qty: 100,
          reserved_qty: 0,
        });
        expect(created).toBeDefined();
        expect(created.id).toMatch(/^sp_/);
        expect(created.vendor_id).toBe('vendor_a');
        expect(created.variant_id).toBe('variant_x');
        // on_hand_qty/reserved_qty are NUMERIC in PG; Medusa returns them as
        // BigNumber-like objects with .numeric (or as string). Check value loosely.
        const onHand = created.on_hand_qty?.numeric ?? created.on_hand_qty;
        expect(Number(onHand)).toBe(100);
        const reserved = created.reserved_qty?.numeric ?? created.reserved_qty;
        expect(Number(reserved)).toBe(0);

        const rows = await svc.listStockPools({ id: created.id });
        expect(rows.length).toBe(1);
      });

      it('rejects duplicate (vendor_id, variant_id) pair', async () => {
        const container = getContainer();
        const svc = container.resolve('wmsService') as any;
        await svc.createStockPools({
          vendor_id: 'v_b',
          variant_id: 'var_y',
          on_hand_qty: 50,
          reserved_qty: 0,
        });
        await expect(svc.createStockPools({
          vendor_id: 'v_b',
          variant_id: 'var_y',
          on_hand_qty: 60,
          reserved_qty: 0,
        })).rejects.toThrow(/unique|duplicate|already exists/i);
      });
    });
  },
});
