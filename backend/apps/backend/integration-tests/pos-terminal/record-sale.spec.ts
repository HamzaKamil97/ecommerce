import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('recordSale', () => {
      // Each test seeds its own stock because medusaIntegrationTestRunner truncates
      // all tables between tests (afterEach teardown). A top-level beforeAll seed
      // would be wiped out before tests 2 and 3 run.

      it('writes sale + lines, decrements stock, returns change', async () => {
        const vendor = 'v_rs_happy';
        const variant = 'var_rs_happy';
        const wms: any = getContainer().resolve('wmsService');
        await wms.incrementStock({ vendor_id: vendor, variant_id: variant, qty: 10, type: 'restock' });

        const svc: any = getContainer().resolve('posTerminalService');
        const cashier = await svc.createCashier({ vendor_id: vendor, name: 'C', pin: '1', role: 'cashier' });
        const out = await svc.recordSale({
          client_id: 'cli_rs_1',
          vendor_id: vendor,
          cashier_id: cashier.id,
          terminal_id: 'term_a',
          lines: [{ variant_id: variant, qty: 3, unit_price_minor: 1000, name_snapshot: 'X' }],
          paid_amount_minor: 5000,
          currency_code: 'iqd',
          client_created_at: new Date().toISOString(),
        });
        expect(out.sale_id).toMatch(/^pos_/);
        expect(out.total_minor).toBe(3000);
        expect(out.change_due_minor).toBe(2000);
        expect(out.stock_after[0].on_hand).toBe(7);
      });

      it('is idempotent on duplicate client_id (no double-decrement)', async () => {
        const vendor = 'v_rs_idem';
        const variant = 'var_rs_idem';
        const wms: any = getContainer().resolve('wmsService');
        await wms.incrementStock({ vendor_id: vendor, variant_id: variant, qty: 10, type: 'restock' });

        const svc: any = getContainer().resolve('posTerminalService');
        const before = await wms.getStock(vendor, variant);
        const cashier = await svc.createCashier({ vendor_id: vendor, name: 'D', pin: '1', role: 'cashier' });
        const args = {
          client_id: 'cli_rs_dup',
          vendor_id: vendor,
          cashier_id: cashier.id,
          terminal_id: 'term_b',
          lines: [{ variant_id: variant, qty: 1, unit_price_minor: 1000, name_snapshot: 'X' }],
          paid_amount_minor: 1000,
          currency_code: 'iqd',
          client_created_at: new Date().toISOString(),
        };
        const a = await svc.recordSale(args);
        const b = await svc.recordSale(args);
        expect(b.sale_id).toBe(a.sale_id);
        const after = await wms.getStock(vendor, variant);
        expect(after.on_hand).toBe(before.on_hand - 1);
      });

      it('rolls back when stock is insufficient', async () => {
        const vendor = 'v_rs_oos';
        const variant = 'var_oos';
        const wms: any = getContainer().resolve('wmsService');
        await wms.incrementStock({ vendor_id: vendor, variant_id: variant, qty: 1, type: 'restock' });

        const svc: any = getContainer().resolve('posTerminalService');
        const cashier = await svc.createCashier({ vendor_id: vendor, name: 'E', pin: '1', role: 'cashier' });
        const args = {
          client_id: 'cli_rs_oos',
          vendor_id: vendor,
          cashier_id: cashier.id,
          terminal_id: 'term_c',
          lines: [{ variant_id: variant, qty: 5, unit_price_minor: 1000, name_snapshot: 'Y' }],
          paid_amount_minor: 5000,
          currency_code: 'iqd',
          client_created_at: new Date().toISOString(),
        };
        await expect(svc.recordSale(args)).rejects.toThrow();
        const after = await wms.getStock(vendor, variant);
        expect(after.on_hand).toBe(1);
        const [rows] = await (svc as any).listAndCountSales({ client_id: 'cli_rs_oos' });
        expect(rows).toHaveLength(0);
      });
    });
  },
});
