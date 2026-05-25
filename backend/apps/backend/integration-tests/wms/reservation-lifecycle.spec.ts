import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('Reservation lifecycle', () => {
      const setup = async (c: any) => {
        const svc = c.resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_lc', variant_id: 'var_lc', qty: 10, type: 'restock' });
        const r = await svc.createReservation({
          vendor_id: 'v_lc', order_id: 'ord_lc', variant_id: 'var_lc', qty: 3,
        });
        return { svc, reservationId: r.id };
      };

      it('consumeReservation decrements on_hand by qty, drops reserved, marks status=consumed', async () => {
        const c = getContainer();
        const { svc, reservationId } = await setup(c);
        const result = await svc.consumeReservation({ reservation_id: reservationId, actor_id: 'picker_1' });
        expect(result.ok).toBe(true);
        const stock = await svc.getStock('v_lc', 'var_lc');
        expect(stock.on_hand).toBe(7);
        expect(stock.reserved).toBe(0);
        expect(stock.available).toBe(7);
        const rows = await svc.listReservations({ id: reservationId });
        expect(rows[0].status).toBe('consumed');
        // Movement audit
        const movs = await svc.listMovements({ source_id: reservationId });
        expect(movs.length).toBe(1);
        expect(movs[0].type).toBe('pick');
        const delta = (movs[0] as any).qty_delta?.numeric ?? movs[0].qty_delta;
        expect(Number(delta)).toBe(-3);
      });

      it('releaseReservation restores reserved capacity without touching on_hand', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_lc2', variant_id: 'var_lc2', qty: 10, type: 'restock' });
        const r = await svc.createReservation({
          vendor_id: 'v_lc2', order_id: 'ord_lc2', variant_id: 'var_lc2', qty: 3,
        });
        const result = await svc.releaseReservation({ reservation_id: r.id, reason: 'customer_cancel' });
        expect(result.ok).toBe(true);
        const stock = await svc.getStock('v_lc2', 'var_lc2');
        expect(stock.on_hand).toBe(10);
        expect(stock.reserved).toBe(0);
        expect(stock.available).toBe(10);
        const rows = await svc.listReservations({ id: r.id });
        expect(rows[0].status).toBe('released');
        const movs = await svc.listMovements({ source_id: r.id });
        expect(movs.length).toBe(1);
        expect(movs[0].type).toBe('release');
      });

      it('cannot consume a reservation twice', async () => {
        const c = getContainer();
        const { svc, reservationId } = await setup(c);
        await svc.consumeReservation({ reservation_id: reservationId });
        await expect(svc.consumeReservation({ reservation_id: reservationId })).rejects.toThrow(/not active/i);
      });

      it('cannot release after consume', async () => {
        const c = getContainer();
        const { svc, reservationId } = await setup(c);
        await svc.consumeReservation({ reservation_id: reservationId });
        await expect(svc.releaseReservation({ reservation_id: reservationId })).rejects.toThrow(/not active/i);
      });
    });
  },
});
