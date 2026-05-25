import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WMS event emissions', () => {
      it('emits wms.stock.decremented after a sale', async () => {
        const c = getContainer();
        const eventBus: any = c.resolve('event_bus');
        const captured: any[] = [];
        const handler = (data: any) => { captured.push(data); };
        await eventBus.subscribe('wms.stock.decremented', handler);

        const svc = c.resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_ev', variant_id: 'var_ev', qty: 5, type: 'restock' });
        await svc.decrementStock({ vendor_id: 'v_ev', variant_id: 'var_ev', qty: 2, type: 'sale', source_id: 'order_z' });
        await new Promise((r) => setTimeout(r, 100));
        expect(captured.length).toBeGreaterThanOrEqual(1);
        const last = captured[captured.length - 1];
        // Medusa wraps the payload — accept either {data: payload} or payload directly
        const payload = last?.data ?? last;
        expect(payload.vendor_id).toBe('v_ev');
        expect(payload.variant_id).toBe('var_ev');
        expect(payload.qty).toBe(2);
      });

      it('emits wms.reservation.created and wms.reservation.consumed', async () => {
        const c = getContainer();
        const eventBus: any = c.resolve('event_bus');
        const created: any[] = [];
        const consumed: any[] = [];
        await eventBus.subscribe('wms.reservation.created', (d: any) => created.push(d));
        await eventBus.subscribe('wms.reservation.consumed', (d: any) => consumed.push(d));

        const svc = c.resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_e2', variant_id: 'var_e2', qty: 5, type: 'restock' });
        const r = await svc.createReservation({ vendor_id: 'v_e2', order_id: 'ord_e2', variant_id: 'var_e2', qty: 1 });
        await svc.consumeReservation({ reservation_id: r.id });
        await new Promise((res) => setTimeout(res, 100));
        expect(created.length).toBeGreaterThanOrEqual(1);
        expect(consumed.length).toBeGreaterThanOrEqual(1);
      });

      it('does NOT emit decremented on insufficient stock', async () => {
        const c = getContainer();
        const eventBus: any = c.resolve('event_bus');
        const captured: any[] = [];
        await eventBus.subscribe('wms.stock.decremented', (d: any) => captured.push(d));

        const svc = c.resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_nf', variant_id: 'var_nf', qty: 1, type: 'restock' });
        // Drain known events; capture only new ones from here
        const before = captured.length;
        await expect(svc.decrementStock({
          vendor_id: 'v_nf', variant_id: 'var_nf', qty: 10, type: 'sale',
        })).rejects.toThrow(/insufficient/i);
        await new Promise((r) => setTimeout(r, 100));
        expect(captured.length).toBe(before);
      });
    });
  },
});
