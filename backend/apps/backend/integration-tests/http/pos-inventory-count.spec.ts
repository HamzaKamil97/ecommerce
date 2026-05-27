import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    it('full open → addLine → apply flow writes audit and decrements wms', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_ic_http', name: 'M', pin: '1234', role: 'manager',
      });

      // Seed a wms on-hand row so applyCount has something to adjust.
      // wms exposes incrementStock + decrementStock + getStock(vendorId, variantId).
      // No upsertOnHand — to seed initial stock, use incrementStock from zero.
      const wms: any = getContainer().resolve('wmsService');
      await wms.incrementStock({
        vendor_id: 'v_ic_http', variant_id: 'v_ic_milk', qty: 10,
        type: 'restock', actor_id: 'seed',
      });

      const openR = await api.post('/pos/inventory-count', {
        vendor_id: 'v_ic_http', actor_id: cashier.id, scope: 'department:dairy',
      });
      expect(openR.status).toBe(200);
      const id = openR.data.session.id;

      const patchR = await api.patch(`/pos/inventory-count/${id}`, {
        variant_id: 'v_ic_milk', system_qty: 10, actual_qty: 8, reason: 'damaged',
      });
      expect(patchR.status).toBe(200);

      const applyR = await api.post(`/pos/inventory-count/${id}/apply`,
        { actor_id: cashier.id },
        { headers: { 'x-cashier-id': cashier.id } },
      );
      expect(applyR.status).toBe(200);
      expect(applyR.data.session.status).toBe('applied');
      expect(Number(applyR.data.session.delta_total)).toBe(-2);

      // wms on-hand decremented: 10 - 2 = 8
      const stock = await wms.getStock('v_ic_http', 'v_ic_milk');
      expect(Number(stock.on_hand)).toBe(8);

      // With the req.audit_context opt-in, all three mutating requests (open,
      // addLine, apply) attribute their audit rows to v_ic_http. PATCH and
      // POST /apply look up the session and set req.audit_context.vendor_id
      // before responding; the middleware reads audit_context at finish time.
      await new Promise(r => setTimeout(r, 200));
      const auditSvc: any = getContainer().resolve('auditLogService');
      const audits = await auditSvc.listAuditByVendor('v_ic_http');
      expect(audits.length).toBeGreaterThanOrEqual(3);
      // open: POST /pos/inventory-count → create
      expect(audits.some((a: any) =>
        a.action === 'create' && a.metadata?.path === '/pos/inventory-count',
      )).toBe(true);
      // addLine: PATCH /pos/inventory-count/:id → update with entity_id === id
      expect(audits.some((a: any) =>
        a.action === 'update' && a.entity_id === id,
      )).toBe(true);
      // apply: POST /pos/inventory-count/:id/apply → create with the apply path
      expect(audits.some((a: any) =>
        a.action === 'create' &&
        a.metadata?.path === `/pos/inventory-count/${id}/apply`,
      )).toBe(true);
    });

    it('apply on missing session returns 404', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_ic_404', name: 'M', pin: '1234', role: 'manager',
      });
      const r = await api.post('/pos/inventory-count/ics_does_not_exist/apply',
        { actor_id: cashier.id },
        { headers: { 'x-cashier-id': cashier.id } },
      ).catch((e: any) => e.response);
      expect(r.status).toBe(404);
      expect(r.data.code).toBe('COUNT_NOT_FOUND');
    });

    it('apply on already-cancelled session returns 409', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_ic_409', name: 'M', pin: '1234', role: 'manager',
      });
      const openR = await api.post('/pos/inventory-count', {
        vendor_id: 'v_ic_409', actor_id: cashier.id, scope: 'all',
      });
      const id = openR.data.session.id;
      await api.delete(`/pos/inventory-count/${id}`);
      const r = await api.post(`/pos/inventory-count/${id}/apply`,
        { actor_id: cashier.id },
        { headers: { 'x-cashier-id': cashier.id } },
      ).catch((e: any) => e.response);
      expect(r.status).toBe(409);
      expect(r.data.code).toBe('COUNT_NOT_OPEN');
    });

    it('apply with insufficient stock returns 207 with applied_line_index', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_ic_partial', name: 'M', pin: '1234', role: 'manager',
      });
      const wms: any = getContainer().resolve('wmsService');
      // Seed: 5 units of widget_a, 0 units of widget_b (no seed).
      await wms.incrementStock({
        vendor_id: 'v_ic_partial', variant_id: 'widget_a', qty: 5,
        type: 'restock', actor_id: 'seed',
      });

      const openR = await api.post('/pos/inventory-count', {
        vendor_id: 'v_ic_partial', actor_id: cashier.id, scope: 'all',
      });
      const id = openR.data.session.id;

      // Line 0: widget_a 5 → 3 (delta=-2, decrement 2 from 5 — succeeds, 3 left).
      await api.patch(`/pos/inventory-count/${id}`, {
        variant_id: 'widget_a', system_qty: 5, actual_qty: 3, reason: 'damaged',
      });
      // Line 1: widget_b 5 → 0 (delta=-5, decrement 5 from on_hand=0 — wms
      // throws WmsInsufficientStockError; the service tags applied_line_index=1).
      await api.patch(`/pos/inventory-count/${id}`, {
        variant_id: 'widget_b', system_qty: 5, actual_qty: 0, reason: 'damaged',
      });

      const r = await api.post(`/pos/inventory-count/${id}/apply`,
        { actor_id: cashier.id },
        { headers: { 'x-cashier-id': cashier.id } },
      ).catch((e: any) => e.response);

      expect(r.status).toBe(207);
      expect(r.data.code).toBe('COUNT_APPLY_PARTIAL');
      expect(r.data.applied_line_index).toBe(1);
      expect(r.data.session_id).toBe(id);
      expect(r.data.failed_variant_id).toBe('widget_b');

      // Line 0's wms decrement was committed before line 1 failed.
      const widgetAStock = await wms.getStock('v_ic_partial', 'widget_a');
      expect(Number(widgetAStock.on_hand)).toBe(3);
    });

    it('apply route enforces catalog.stock_count capability — 403 when denied', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_ic_deny', name: 'C', pin: '1234', role: 'cashier',
      });
      // Cashiers don't get catalog.stock_count by default per H-3.2a capabilities matrix.
      // No override needed.
      const openR = await api.post('/pos/inventory-count', {
        vendor_id: 'v_ic_deny', actor_id: cashier.id, scope: 'all',
      });
      const id = openR.data.session.id;
      const r = await api.post(`/pos/inventory-count/${id}/apply`,
        { actor_id: cashier.id },
        { headers: { 'x-cashier-id': cashier.id } },
      ).catch((e: any) => e.response);
      expect(r.status).toBe(403);
      expect(r.data.code).toBe('PERMISSION_DENIED');
    });
  },
});
