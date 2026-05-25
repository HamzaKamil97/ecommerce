import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.decrementStock', () => {
      const seed = async (svc: any, vendor: string, variant: string, onHand: number) => {
        await svc.createStockPools({
          vendor_id: vendor, variant_id: variant,
          on_hand_qty: onHand, reserved_qty: 0,
        });
      };

      it('decrements on_hand by qty and writes a movement row', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await seed(svc, 'v_dec', 'var_a', 50);
        const result = await svc.decrementStock({
          vendor_id: 'v_dec', variant_id: 'var_a', qty: 3, type: 'sale',
          source_id: 'order_1', actor_id: 'cashier_1',
        });
        expect(result.new_on_hand).toBe(47);
        expect(result.movement_id).toMatch(/^mv_/);
        const after = await svc.getStock('v_dec', 'var_a');
        expect(after.on_hand).toBe(47);
        const movements = await svc.listMovements({ source_id: 'order_1' });
        expect(movements.length).toBe(1);
        const delta = (movements[0] as any).qty_delta?.numeric ?? movements[0].qty_delta;
        expect(Number(delta)).toBe(-3);
      });

      it('throws WmsInsufficientStockError when qty > available', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await seed(svc, 'v_dec2', 'var_b', 5);
        await expect(svc.decrementStock({
          vendor_id: 'v_dec2', variant_id: 'var_b', qty: 10, type: 'sale',
        })).rejects.toThrow(/insufficient/i);
        // No partial state change
        const stock = await svc.getStock('v_dec2', 'var_b');
        expect(stock.on_hand).toBe(5);
      });

      it('creates an implicit pool with on_hand=0 if missing, then rejects qty>0', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await expect(svc.decrementStock({
          vendor_id: 'v_dec3', variant_id: 'var_new', qty: 1, type: 'sale',
        })).rejects.toThrow(/insufficient/i);
        // Pool should now exist with 0/0
        const stock = await svc.getStock('v_dec3', 'var_new');
        expect(stock.on_hand).toBe(0);
        expect(stock.reserved).toBe(0);
      });
    });
  },
});
