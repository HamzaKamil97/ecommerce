import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.incrementStock', () => {
      it('adds qty to on_hand and logs a restock movement (also creates pool if missing)', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        const first = await svc.incrementStock({
          vendor_id: 'v_inc', variant_id: 'var_inc', qty: 25, type: 'restock', source_id: 'po_99',
        });
        expect(first.new_on_hand).toBe(25);
        expect(first.movement_id).toMatch(/^mv_/);
        let stock = await svc.getStock('v_inc', 'var_inc');
        expect(stock.on_hand).toBe(25);

        const second = await svc.incrementStock({
          vendor_id: 'v_inc', variant_id: 'var_inc', qty: 10, type: 'restock', source_id: 'po_100',
        });
        expect(second.new_on_hand).toBe(35);
        stock = await svc.getStock('v_inc', 'var_inc');
        expect(stock.on_hand).toBe(35);

        const movements = await svc.listMovements({ vendor_id: 'v_inc', variant_id: 'var_inc' });
        expect(movements.length).toBe(2);
      });

      it('rejects qty <= 0', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await expect(svc.incrementStock({
          vendor_id: 'v_x', variant_id: 'var_x', qty: -1, type: 'restock',
        })).rejects.toThrow(/positive/i);
        await expect(svc.incrementStock({
          vendor_id: 'v_x', variant_id: 'var_x', qty: 0, type: 'restock',
        })).rejects.toThrow(/positive/i);
      });
    });
  },
});
