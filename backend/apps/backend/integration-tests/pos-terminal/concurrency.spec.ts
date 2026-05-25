import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

jest.setTimeout(120_000);

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('two terminals racing for the last unit', () => {
      it('exactly one of 100 concurrent single-unit sales succeeds when seed=1', async () => {
        const svc: any = getContainer().resolve('posTerminalService');
        const wms: any = getContainer().resolve('wmsService');
        const vendor = 'v_race';
        const variant = 'var_race';
        await wms.incrementStock({ vendor_id: vendor, variant_id: variant, qty: 1, type: 'restock' });
        const cashier = await svc.createCashier({ vendor_id: vendor, name: 'R', pin: '1', role: 'cashier' });
        const tries = Array.from({ length: 100 }, (_, i) =>
          svc.recordSale({
            client_id: `race_${i}`,
            vendor_id: vendor,
            cashier_id: cashier.id,
            terminal_id: `t_${i % 4}`,
            lines: [{ variant_id: variant, qty: 1, unit_price_minor: 1000, name_snapshot: 'R' }],
            paid_amount_minor: 1000,
            currency_code: 'iqd',
            client_created_at: new Date().toISOString(),
          }).then(() => 'ok').catch(() => 'fail')
        );
        const results = await Promise.all(tries);
        const ok = results.filter((r) => r === 'ok').length;
        const fail = results.filter((r) => r === 'fail').length;
        expect(ok).toBe(1);
        expect(fail).toBe(99);
        const after = await wms.getStock(vendor, variant);
        expect(after.on_hand).toBe(0);
      });
    });
  },
});
