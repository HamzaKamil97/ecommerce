import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { bootstrapAdmin } from '../helpers/admin';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>;
    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer());
      adminHeaders = headers;
    });

    it('approves 3 refunds atomically (Path B: inline payloads)', async () => {
      const pos: any = getContainer().resolve('posTerminalService');
      const wms: any = getContainer().resolve('wmsService');
      const vendor_id = 'v_bulk_ok';
      const approver = await pos.createCashier({
        vendor_id, name: 'Mgr', pin: '0000', role: 'manager',
      });

      // Seed three distinct variants with enough stock to be restocked
      for (const v of ['vbulk_a', 'vbulk_b', 'vbulk_c']) {
        await wms.incrementStock({
          vendor_id, variant_id: v, qty: 5, type: 'restock', actor_id: 'seed',
        });
      }

      const refunds = [
        {
          vendor_id, cashier_id: approver.id, manager_id: approver.id,
          terminal_id: 't_bulk', original_sale_id: 's_bulk_a', client_id: 'cl_bulk_a',
          method: 'cash' as const,
          lines: [{ original_sale_line_id: 'sl_a', variant_id: 'vbulk_a', qty: 1, unit_price_minor: 100, reason: 'changed_mind' }],
        },
        {
          vendor_id, cashier_id: approver.id, manager_id: approver.id,
          terminal_id: 't_bulk', original_sale_id: 's_bulk_b', client_id: 'cl_bulk_b',
          method: 'cash' as const,
          lines: [{ original_sale_line_id: 'sl_b', variant_id: 'vbulk_b', qty: 2, unit_price_minor: 200, reason: 'changed_mind' }],
        },
        {
          vendor_id, cashier_id: approver.id, manager_id: approver.id,
          terminal_id: 't_bulk', original_sale_id: 's_bulk_c', client_id: 'cl_bulk_c',
          method: 'cash' as const,
          lines: [{ original_sale_line_id: 'sl_c', variant_id: 'vbulk_c', qty: 1, unit_price_minor: 300, reason: 'changed_mind' }],
        },
      ];

      const r = await api.post(
        '/admin/approvals/refunds/bulk',
        { refunds, decision: 'approve', approver_id: approver.id },
        { headers: adminHeaders },
      );

      expect(r.status).toBe(200);
      expect(r.data.processed).toBe(3);
      expect(r.data.failed).toEqual([]);
      expect(Array.isArray(r.data.results)).toBe(true);
      expect(r.data.results.length).toBe(3);

      // Stock got restocked (+1, +2, +1)
      const a = await wms.getStock(vendor_id, 'vbulk_a');
      const b = await wms.getStock(vendor_id, 'vbulk_b');
      const c = await wms.getStock(vendor_id, 'vbulk_c');
      expect(Number(a.on_hand)).toBe(6);
      expect(Number(b.on_hand)).toBe(7);
      expect(Number(c.on_hand)).toBe(6);
    });

    it('rolls back the entire batch if any refund fails', async () => {
      const pos: any = getContainer().resolve('posTerminalService');
      const wms: any = getContainer().resolve('wmsService');
      const vendor_id = 'v_bulk_rollback';
      const approver = await pos.createCashier({
        vendor_id, name: 'Mgr', pin: '0000', role: 'manager',
      });
      // Seed only the good variant
      await wms.incrementStock({
        vendor_id, variant_id: 'vbulk_good', qty: 5, type: 'restock', actor_id: 'seed',
      });

      const goodRefund = {
        vendor_id, cashier_id: approver.id, manager_id: approver.id,
        terminal_id: 't_rb', original_sale_id: 's_rb_good', client_id: 'cl_rb_good',
        method: 'cash' as const,
        lines: [{ original_sale_line_id: 'sl_g', variant_id: 'vbulk_good', qty: 1, unit_price_minor: 100, reason: 'changed_mind' }],
      };
      const badRefund = {
        // Empty lines triggers InvalidRefundError inside processReturn → 'no lines to refund'
        vendor_id, cashier_id: approver.id, manager_id: approver.id,
        terminal_id: 't_rb', original_sale_id: 's_rb_bad', client_id: 'cl_rb_bad',
        method: 'cash' as const,
        lines: [],
      };

      const r = await api.post(
        '/admin/approvals/refunds/bulk',
        { refunds: [goodRefund, badRefund], decision: 'approve', approver_id: approver.id },
        { headers: adminHeaders },
      ).catch((e: any) => e.response);

      expect(r.status).toBe(409);
      expect(r.data.error).toMatch(/rolled back/i);
      expect(r.data.processed_before_failure).toBe(1);

      // Stock for the good variant must be back to its seeded baseline (5),
      // proving the good refund's restock was compensated.
      const stock = await wms.getStock(vendor_id, 'vbulk_good');
      expect(Number(stock.on_hand)).toBe(5);
    });

    it('rejects empty input with 400', async () => {
      const r = await api.post(
        '/admin/approvals/refunds/bulk',
        { refunds: [], decision: 'approve', approver_id: 'a1' },
        { headers: adminHeaders },
      ).catch((e: any) => e.response);
      expect(r.status).toBe(400);
      expect(r.data.error).toMatch(/non-empty/i);
    });
  },
});
