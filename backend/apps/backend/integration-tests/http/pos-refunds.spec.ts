import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    it('manager refund: damaged + changed_mind dispatches correctly to wms + writes audit', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const manager = await posSvc.createCashier({
        vendor_id: 'v_ref_mgr', name: 'Mgr', pin: '9999', role: 'manager',
      });

      const wms: any = getContainer().resolve('wmsService');
      // Seed rice with 5, yogurt with 5 (changed_mind returns rice, expired writes off yogurt)
      await wms.incrementStock({
        vendor_id: 'v_ref_mgr', variant_id: 'v_rice', qty: 5,
        type: 'restock', actor_id: 'seed',
      });
      await wms.incrementStock({
        vendor_id: 'v_ref_mgr', variant_id: 'v_yogurt', qty: 5,
        type: 'restock', actor_id: 'seed',
      });

      const r = await api.post('/pos/refunds', {
        vendor_id: 'v_ref_mgr', cashier_id: manager.id, manager_id: manager.id,
        terminal_id: 't_ref_mgr', original_sale_id: 's_orig', client_id: 'cl_mgr_1',
        method: 'cash',
        lines: [
          { original_sale_line_id: 'sl1', variant_id: 'v_rice', qty: 1, unit_price_minor: 22000, reason: 'changed_mind' },
          { original_sale_line_id: 'sl2', variant_id: 'v_yogurt', qty: 2, unit_price_minor: 2000, reason: 'expired' },
        ],
      }, { headers: { 'x-cashier-id': manager.id } });

      expect(r.status).toBe(200);
      expect(r.data.refund.refund_total_minor).toBe(22000 + 4000);
      expect(r.data.refund.stock_returned_units).toBe(1);
      expect(r.data.refund.stock_damaged_units).toBe(2);

      // Rice was returned to stock: 5 + 1 = 6
      const rice = await wms.getStock('v_ref_mgr', 'v_rice');
      expect(Number(rice.on_hand)).toBe(6);
      // Yogurt was expired (written off) — stock unchanged from seed (5)
      const yogurt = await wms.getStock('v_ref_mgr', 'v_yogurt');
      expect(Number(yogurt.on_hand)).toBe(5);

      // Audit row attributed to vendor (audit_context wired in route)
      await new Promise(r => setTimeout(r, 200));
      const auditSvc: any = getContainer().resolve('auditLogService');
      const audits = await auditSvc.listAuditByVendor('v_ref_mgr');
      expect(audits.some((a: any) =>
        a.metadata?.path === '/pos/refunds' && a.action === 'create',
      )).toBe(true);
    });

    it('cashier refund without x-pin-confirm returns 401 PIN_REQUIRED', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_ref_pin', name: 'Cashier', pin: '1111', role: 'cashier',
      });
      const r = await api.post('/pos/refunds', {
        vendor_id: 'v_ref_pin', cashier_id: cashier.id, manager_id: cashier.id,
        terminal_id: 't', original_sale_id: 's', client_id: 'cl_pin_1', method: 'cash',
        lines: [{ original_sale_line_id: 'sl', variant_id: 'v1', qty: 1, unit_price_minor: 100, reason: 'changed_mind' }],
      }, { headers: { 'x-cashier-id': cashier.id } }).catch((e: any) => e.response);
      expect(r.status).toBe(401);
      expect(r.data.code).toBe('PIN_REQUIRED');
    });

    it('cashier refund with valid x-pin-confirm succeeds', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_ref_pinok', name: 'Cashier', pin: '2222', role: 'cashier',
      });
      const wms: any = getContainer().resolve('wmsService');
      await wms.incrementStock({
        vendor_id: 'v_ref_pinok', variant_id: 'v_milk', qty: 10,
        type: 'restock', actor_id: 'seed',
      });

      const r = await api.post('/pos/refunds', {
        vendor_id: 'v_ref_pinok', cashier_id: cashier.id, manager_id: cashier.id,
        terminal_id: 't_pinok', original_sale_id: 's', client_id: 'cl_pinok_1', method: 'cash',
        lines: [{ original_sale_line_id: 'sl', variant_id: 'v_milk', qty: 1, unit_price_minor: 2750, reason: 'changed_mind' }],
      }, {
        headers: { 'x-cashier-id': cashier.id, 'x-pin-confirm': '2222' },
      });

      expect(r.status).toBe(200);
      expect(r.data.refund.refund_total_minor).toBe(2750);
      const milk = await wms.getStock('v_ref_pinok', 'v_milk');
      expect(Number(milk.on_hand)).toBe(11);
    });

    it('cashier refund with bad PIN returns 401 BAD_PIN', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_ref_badpin', name: 'Cashier', pin: '3333', role: 'cashier',
      });
      const r = await api.post('/pos/refunds', {
        vendor_id: 'v_ref_badpin', cashier_id: cashier.id, manager_id: cashier.id,
        terminal_id: 't', original_sale_id: 's', client_id: 'cl_bad_1', method: 'cash',
        lines: [{ original_sale_line_id: 'sl', variant_id: 'v1', qty: 1, unit_price_minor: 100, reason: 'changed_mind' }],
      }, {
        headers: { 'x-cashier-id': cashier.id, 'x-pin-confirm': '9999' },  // wrong pin
      }).catch((e: any) => e.response);
      expect(r.status).toBe(401);
      expect(r.data.code).toBe('BAD_PIN');
    });

    it('rejects empty lines with 400', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const manager = await posSvc.createCashier({
        vendor_id: 'v_ref_empty', name: 'Mgr', pin: '0000', role: 'manager',
      });
      const r = await api.post('/pos/refunds', {
        vendor_id: 'v_ref_empty', cashier_id: manager.id, manager_id: manager.id,
        terminal_id: 't', original_sale_id: 's', client_id: 'cl_empty_1', method: 'cash',
        lines: [],
      }, { headers: { 'x-cashier-id': manager.id } }).catch((e: any) => e.response);
      expect(r.status).toBe(400);
      expect(r.data.code).toBe('INVALID_REFUND');
    });

    it('GET /pos/refunds/:id returns the refund sale + lines', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const mgr = await posSvc.createCashier({
        vendor_id: 'v_ref_get', name: 'Mgr', pin: '0000', role: 'manager',
      });
      const wms: any = getContainer().resolve('wmsService');
      await wms.incrementStock({
        vendor_id: 'v_ref_get', variant_id: 'v_get', qty: 5,
        type: 'restock', actor_id: 'seed',
      });
      const createR = await api.post('/pos/refunds', {
        vendor_id: 'v_ref_get', cashier_id: mgr.id, manager_id: mgr.id,
        terminal_id: 't_get', original_sale_id: 's_get', client_id: 'cl_get_1', method: 'cash',
        lines: [{ original_sale_line_id: 'sl', variant_id: 'v_get', qty: 1, unit_price_minor: 500, reason: 'changed_mind' }],
      }, { headers: { 'x-cashier-id': mgr.id } });
      const refund_id = createR.data.refund.refund_sale_id;

      const r = await api.get(`/pos/refunds/${refund_id}`);
      expect(r.status).toBe(200);
      expect(r.data.sale.id).toBe(refund_id);
      expect(r.data.sale.status).toBe('voided');
      expect(r.data.lines.length).toBe(1);
      // Refund lines have NEGATIVE qty per the convention
      expect(Number(r.data.lines[0].qty)).toBe(-1);
    });
  },
});
