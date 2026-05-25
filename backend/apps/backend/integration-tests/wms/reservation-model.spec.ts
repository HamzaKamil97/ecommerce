import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('Reservation model', () => {
      it('persists a reservation row with status=active by default', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        const future = new Date(Date.now() + 15 * 60_000);
        const created = await svc.createReservations({
          vendor_id: 'v_a', order_id: 'order_1', variant_id: 'var_x',
          qty: 2, expires_at: future,
        });
        expect(created.id).toMatch(/^rs_/);
        expect(created.status).toBe('active');
        const qty = (created as any).qty?.numeric ?? created.qty;
        expect(Number(qty)).toBe(2);

        const rows = await svc.listReservations({ id: created.id });
        expect(rows.length).toBe(1);
      });

      it('rejects invalid status', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        const future = new Date(Date.now() + 60_000);
        await expect(svc.createReservations({
          vendor_id: 'v_a', order_id: 'order_2', variant_id: 'var_x',
          qty: 1, expires_at: future, status: 'not_a_status',
        })).rejects.toThrow();
      });
    });
  },
});
