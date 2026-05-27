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

      // Audit row written by middleware. The audit middleware reads vendor_id
      // from query/body/params — only the POST /pos/inventory-count (open)
      // request carries vendor_id, so PATCH addLine and POST apply audit rows
      // get vendor_id=null. We assert at least the open row was written under
      // this vendor; full audit coverage is verified in audit-log-middleware.spec.
      await new Promise(r => setTimeout(r, 200));
      const auditSvc: any = getContainer().resolve('auditLogService');
      const audits = await auditSvc.listAuditByVendor('v_ic_http');
      expect(audits.some((a: any) => a.action === 'create' && a.module === 'inventory-count')).toBe(true);
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
