import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('Reservation expiry', () => {
      it('expireReservations marks expired rows and frees reserved capacity', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_exp', variant_id: 'var_e', qty: 10, type: 'restock' });
        // Reservation with 1-second TTL
        const r = await svc.createReservation({
          vendor_id: 'v_exp', order_id: 'ord_exp', variant_id: 'var_e', qty: 5, ttl_seconds: 1,
        });
        // Confirm capacity is reserved
        let stock = await svc.getStock('v_exp', 'var_e');
        expect(stock.reserved).toBe(5);
        expect(stock.available).toBe(5);

        // Wait for TTL to elapse
        await new Promise((res) => setTimeout(res, 1500));
        const result = await svc.expireReservations();
        expect(result.expired_count).toBeGreaterThanOrEqual(1);

        stock = await svc.getStock('v_exp', 'var_e');
        expect(stock.on_hand).toBe(10);
        expect(stock.reserved).toBe(0);
        expect(stock.available).toBe(10);

        const rows = await svc.listReservations({ id: r.id });
        expect(rows[0].status).toBe('expired');

        const movs = await svc.listMovements({ source_id: r.id });
        expect(movs.length).toBe(1);
        expect(movs[0].type).toBe('release');
        expect(movs[0].note).toBe('auto-expired');
      });

      it('does not touch reservations that are not yet expired', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_exp2', variant_id: 'var_e2', qty: 10, type: 'restock' });
        await svc.createReservation({
          vendor_id: 'v_exp2', order_id: 'ord_x', variant_id: 'var_e2', qty: 4,
          ttl_seconds: 600,  // 10 minutes — definitely not expired
        });
        const result = await svc.expireReservations();
        // Even if there are other expired rows from prior tests, the v_exp2 one is untouched
        const stock = await svc.getStock('v_exp2', 'var_e2');
        expect(stock.reserved).toBe(4);
      });
    });
  },
});
