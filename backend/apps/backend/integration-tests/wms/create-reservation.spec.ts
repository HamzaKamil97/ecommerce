import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.createReservation', () => {
      const seed = async (svc: any, v: string, var_: string, onHand: number) => {
        await svc.incrementStock({ vendor_id: v, variant_id: var_, qty: onHand, type: 'restock' });
      };

      it('creates an active reservation when available stock suffices, and bumps reserved_qty on pool', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await seed(svc, 'v_rsv', 'var_z', 10);
        const r = await svc.createReservation({
          vendor_id: 'v_rsv', order_id: 'ord_1', variant_id: 'var_z', qty: 3,
        });
        expect(r.id).toMatch(/^rs_/);
        expect(r.status).toBe('active');
        expect(r.expires_at).toBeInstanceOf(Date);
        const stock = await svc.getStock('v_rsv', 'var_z');
        expect(stock.on_hand).toBe(10);
        expect(stock.reserved).toBe(3);
        expect(stock.available).toBe(7);
      });

      it('rejects when requested qty exceeds available (on_hand - active reservations)', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await seed(svc, 'v_rsv2', 'var_w', 5);
        await svc.createReservation({ vendor_id: 'v_rsv2', order_id: 'ord_a', variant_id: 'var_w', qty: 4 });
        await expect(svc.createReservation({
          vendor_id: 'v_rsv2', order_id: 'ord_b', variant_id: 'var_w', qty: 2,
        })).rejects.toThrow(/insufficient/i);
      });

      it('default TTL is 15 minutes (within ±60s tolerance)', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await seed(svc, 'v_ttl', 'var_t', 10);
        const before = Date.now();
        const r = await svc.createReservation({
          vendor_id: 'v_ttl', order_id: 'ord_t', variant_id: 'var_t', qty: 1,
        });
        const ttlMs = r.expires_at.getTime() - before;
        expect(ttlMs).toBeGreaterThan(14 * 60_000);
        expect(ttlMs).toBeLessThan(16 * 60_000);
      });

      it('honors ttl_seconds override', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await seed(svc, 'v_ttl2', 'var_t2', 10);
        const before = Date.now();
        const r = await svc.createReservation({
          vendor_id: 'v_ttl2', order_id: 'ord_t2', variant_id: 'var_t2', qty: 1, ttl_seconds: 30,
        });
        const ttlMs = r.expires_at.getTime() - before;
        expect(ttlMs).toBeGreaterThan(20_000);
        expect(ttlMs).toBeLessThan(45_000);
      });
    });
  },
});
