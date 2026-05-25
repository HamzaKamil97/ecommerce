import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

jest.setTimeout(60_000);

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WMS end-to-end order loop', () => {
      it('shop has 5 → customer reserves 2 → picker confirms → on_hand=3 reserved=0', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_e2e', variant_id: 'var_e2e', qty: 5, type: 'restock' });
        const r = await svc.createReservation({
          vendor_id: 'v_e2e', order_id: 'ord_e2e_1', variant_id: 'var_e2e', qty: 2,
        });
        let snap = await svc.getStock('v_e2e', 'var_e2e');
        expect(snap.on_hand).toBe(5);
        expect(snap.reserved).toBe(2);
        expect(snap.available).toBe(3);

        await svc.consumeReservation({ reservation_id: r.id, actor_id: 'picker_e2e' });
        snap = await svc.getStock('v_e2e', 'var_e2e');
        expect(snap.on_hand).toBe(3);
        expect(snap.reserved).toBe(0);
        expect(snap.available).toBe(3);
      });

      it('shop has 5 → customer reserves 4 → cancels → release returns capacity → second customer can order 4', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_e2e2', variant_id: 'var_e2e2', qty: 5, type: 'restock' });
        const r = await svc.createReservation({
          vendor_id: 'v_e2e2', order_id: 'ord_x', variant_id: 'var_e2e2', qty: 4,
        });
        await svc.releaseReservation({ reservation_id: r.id, reason: 'customer_cancel' });
        const r2 = await svc.createReservation({
          vendor_id: 'v_e2e2', order_id: 'ord_y', variant_id: 'var_e2e2', qty: 4,
        });
        expect(r2.id).toMatch(/^rs_/);
        const snap = await svc.getStock('v_e2e2', 'var_e2e2');
        expect(snap.on_hand).toBe(5);
        expect(snap.reserved).toBe(4);
        expect(snap.available).toBe(1);
      });

      it('reservation TTL expires → released stock available again', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_ttl_e2e', variant_id: 'var_ttl', qty: 3, type: 'restock' });
        await svc.createReservation({
          vendor_id: 'v_ttl_e2e', order_id: 'ord_ttl', variant_id: 'var_ttl', qty: 3, ttl_seconds: 1,
        });
        let snap = await svc.getStock('v_ttl_e2e', 'var_ttl');
        expect(snap.available).toBe(0);
        await new Promise((r) => setTimeout(r, 1500));
        await svc.expireReservations();
        snap = await svc.getStock('v_ttl_e2e', 'var_ttl');
        expect(snap.available).toBe(3);
        expect(snap.on_hand).toBe(3);
        expect(snap.reserved).toBe(0);
      });
    });
  },
});
