import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    it('list → accept → handoff writes audit rows attributed to vendor', async () => {
      const svc: any = getContainer().resolve('onlineOrderService');
      const o = await svc.createOrder({
        vendor_id: 'v_oo_http', customer_name: 'Test', total_minor: 1000,
        commission_rate_bps_snapshot: 700, commission_minor: 70,
        lines: [{ variant_id: 'v1', title: 'X', qty: 1, unit_price_minor: 1000, line_total_minor: 1000 }],
      });

      const listR = await api.get('/pos/online-orders?vendor_id=v_oo_http&status=pending');
      expect(listR.status).toBe(200);
      expect(listR.data.orders.some((x: any) => x.id === o.id)).toBe(true);

      const acceptR = await api.post(`/pos/online-orders/${o.id}/accept`, {});
      expect(acceptR.status).toBe(200);
      expect(acceptR.data.order.status).toBe('accepted');
      expect(acceptR.data.order.accepted_at).toBeTruthy();

      const handR = await api.post(`/pos/online-orders/${o.id}/handoff`, {});
      expect(handR.status).toBe(200);
      expect(handR.data.order.status).toBe('delivered');

      // Audit rows: accept and handoff both attribute to v_oo_http via audit_context
      await new Promise(r => setTimeout(r, 200));
      const auditSvc: any = getContainer().resolve('auditLogService');
      const audits = await auditSvc.listAuditByVendor('v_oo_http');
      expect(audits.length).toBeGreaterThanOrEqual(2);
      expect(audits.some((a: any) =>
        a.module === 'online-orders' && a.metadata?.path === `/pos/online-orders/${o.id}/accept`,
      )).toBe(true);
      expect(audits.some((a: any) =>
        a.module === 'online-orders' && a.metadata?.path === `/pos/online-orders/${o.id}/handoff`,
      )).toBe(true);
    });

    it('partial accepts the order and flags OOS lines', async () => {
      const svc: any = getContainer().resolve('onlineOrderService');
      const o = await svc.createOrder({
        vendor_id: 'v_oo_p', total_minor: 2000,
        commission_rate_bps_snapshot: 700, commission_minor: 140,
        lines: [
          { variant_id: 'v1', title: 'A', qty: 1, unit_price_minor: 1000, line_total_minor: 1000 },
          { variant_id: 'v2', title: 'B', qty: 1, unit_price_minor: 1000, line_total_minor: 1000 },
        ],
      });
      const full = await svc.getWithLines(o.id);
      const oosId = full.lines[0].id;

      const r = await api.post(`/pos/online-orders/${o.id}/partial`, { oos_line_ids: [oosId] });
      expect(r.status).toBe(200);
      expect(r.data.oos_line_count).toBe(1);
      expect(r.data.order.status).toBe('accepted');

      const refreshed = await svc.getWithLines(o.id);
      const lineA = refreshed.lines.find((l: any) => l.id === oosId);
      expect(lineA.oos).toBe(true);
    });

    it('reject transitions to rejected and stamps rejected_at', async () => {
      const svc: any = getContainer().resolve('onlineOrderService');
      const o = await svc.createOrder({
        vendor_id: 'v_oo_rej', total_minor: 500,
        commission_rate_bps_snapshot: 700, commission_minor: 35,
        lines: [{ variant_id: 'v1', title: 'X', qty: 1, unit_price_minor: 500, line_total_minor: 500 }],
      });
      const r = await api.post(`/pos/online-orders/${o.id}/reject`, {});
      expect(r.status).toBe(200);
      expect(r.data.order.status).toBe('rejected');
      expect(r.data.order.rejected_at).toBeTruthy();
    });

    it('accept on missing order returns 404', async () => {
      const r = await api.post('/pos/online-orders/oo_does_not_exist/accept', {})
        .catch((e: any) => e.response);
      expect(r.status).toBe(404);
    });

    it('list requires vendor_id', async () => {
      const r = await api.get('/pos/online-orders').catch((e: any) => e.response);
      expect(r.status).toBe(400);
    });

    it('GET single returns 404 for missing id', async () => {
      const r = await api.get('/pos/online-orders/oo_nope').catch((e: any) => e.response);
      expect(r.status).toBe(404);
    });
  },
});
