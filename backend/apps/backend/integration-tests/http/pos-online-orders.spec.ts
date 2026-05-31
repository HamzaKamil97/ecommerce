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

      // Seed stock so accept can reserve
      const wms: any = getContainer().resolve('wmsService');
      await wms.incrementStock({ vendor_id: 'v_oo_http', variant_id: 'v1', qty: 5, type: 'restock' });

      const listR = await api.get('/pos/online-orders?vendor_id=v_oo_http&status=pending');
      expect(listR.status).toBe(200);
      expect(listR.data.orders.some((x: any) => x.id === o.id)).toBe(true);

      const acceptR = await api.post(`/pos/online-orders/${o.id}/accept`, {});
      expect(acceptR.status).toBe(200);
      expect(acceptR.data.order.status).toBe('accepted');
      expect(acceptR.data.order.accepted_at).toBeTruthy();

      // Verify reservation was created (concrete values: seeded 5, reserved 1)
      const snap = await wms.getStock('v_oo_http', 'v1');
      expect(snap.on_hand).toBe(5);
      expect(snap.reserved).toBe(1);
      expect(snap.available).toBe(4);

      const handR = await api.post(`/pos/online-orders/${o.id}/handoff`, {});
      expect(handR.status).toBe(200);
      expect(handR.data.order.status).toBe('delivered');

      // handoff consumed the reservation → on_hand decremented, hold released
      const afterHand = await wms.getStock('v_oo_http', 'v1');
      expect(afterHand.reserved).toBe(0);
      expect(afterHand.on_hand).toBe(4); // 5 seeded − 1 consumed

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

      // Seed stock so partial's non-OOS lines can be reserved (partial accepts too, needs available stock)
      const wms: any = getContainer().resolve('wmsService');
      await wms.incrementStock({ vendor_id: 'v_oo_p', variant_id: 'v1', qty: 5, type: 'restock' });
      await wms.incrementStock({ vendor_id: 'v_oo_p', variant_id: 'v2', qty: 5, type: 'restock' });

      const full = await svc.getWithLines(o.id);
      const oosId = full.lines[0].id; // lines[0] = v1 (inserted first, ordered ASC by created_at)

      const r = await api.post(`/pos/online-orders/${o.id}/partial`, { oos_line_ids: [oosId] });
      expect(r.status).toBe(200);
      expect(r.data.oos_line_count).toBe(1);
      expect(r.data.order.status).toBe('accepted');

      const refreshed = await svc.getWithLines(o.id);
      const lineA = refreshed.lines.find((l: any) => l.id === oosId);
      expect(lineA.oos).toBe(true);

      // Reservations: OOS line (v1) should NOT be reserved; non-OOS line (v2) should be reserved
      const snap1 = await wms.getStock('v_oo_p', 'v1'); // OOS line
      const snap2 = await wms.getStock('v_oo_p', 'v2'); // fulfilled line
      expect(snap1.reserved).toBe(0); // OOS → not reserved
      expect(snap2.reserved).toBe(1); // non-OOS → reserved
    });

    it('double partial is idempotent: 2nd call 409s and does not double-reserve', async () => {
      const svc: any = getContainer().resolve('onlineOrderService');
      const wms: any = getContainer().resolve('wmsService');
      const o = await svc.createOrder({
        vendor_id: 'v_oo_pdbl', total_minor: 1000,
        commission_rate_bps_snapshot: 700, commission_minor: 70,
        lines: [{ variant_id: 'pd1', title: 'X', qty: 2, unit_price_minor: 500, line_total_minor: 1000 }],
      });
      await wms.incrementStock({ vendor_id: 'v_oo_pdbl', variant_id: 'pd1', qty: 10, type: 'restock' });

      const first = await api.post(`/pos/online-orders/${o.id}/partial`, { oos_line_ids: [] });
      expect(first.status).toBe(200);
      expect((await wms.getStock('v_oo_pdbl', 'pd1')).reserved).toBe(2);

      const second = await api.post(`/pos/online-orders/${o.id}/partial`, { oos_line_ids: [] }).catch((e: any) => e.response);
      expect(second.status).toBe(409); // already accepted, not pending
      expect((await wms.getStock('v_oo_pdbl', 'pd1')).reserved).toBe(2); // not doubled
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

    it('reject after accept releases reservations (on_hand untouched)', async () => {
      const svc: any = getContainer().resolve('onlineOrderService');
      const wms: any = getContainer().resolve('wmsService');
      const o = await svc.createOrder({
        vendor_id: 'v_oo_relrej', total_minor: 1000,
        commission_rate_bps_snapshot: 700, commission_minor: 70,
        lines: [{ variant_id: 'rr1', title: 'X', qty: 2, unit_price_minor: 500, line_total_minor: 1000 }],
      });
      await wms.incrementStock({ vendor_id: 'v_oo_relrej', variant_id: 'rr1', qty: 10, type: 'restock' });
      await api.post(`/pos/online-orders/${o.id}/accept`, {});
      expect((await wms.getStock('v_oo_relrej', 'rr1')).reserved).toBe(2);

      const r = await api.post(`/pos/online-orders/${o.id}/reject`, {});
      expect(r.status).toBe(200);
      expect(r.data.order.status).toBe('rejected');
      const snap = await wms.getStock('v_oo_relrej', 'rr1');
      expect(snap.reserved).toBe(0);   // released
      expect(snap.on_hand).toBe(10);   // NOT decremented
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

    it('handoff and reject return 404 for missing order', async () => {
      const h = await api.post('/pos/online-orders/oo_missing/handoff', {}).catch((e: any) => e.response);
      expect(h.status).toBe(404);
      const j = await api.post('/pos/online-orders/oo_missing/reject', {}).catch((e: any) => e.response);
      expect(j.status).toBe(404);
    });

    it('partial with insufficient stock for a non-OOS line returns 409 and reserves nothing', async () => {
      const svc: any = getContainer().resolve('onlineOrderService');
      const wms: any = getContainer().resolve('wmsService');
      const o = await svc.createOrder({
        vendor_id: 'v_oo_pshort', total_minor: 2000,
        commission_rate_bps_snapshot: 700, commission_minor: 140,
        lines: [
          { variant_id: 'ps_oos', title: 'OOS', qty: 1, unit_price_minor: 1000, line_total_minor: 1000 },
          { variant_id: 'ps_short', title: 'Short', qty: 3, unit_price_minor: 1000, line_total_minor: 3000 },
        ],
      });
      // Only 1 of ps_short in stock, but the non-OOS line needs 3 → shortfall.
      await wms.incrementStock({ vendor_id: 'v_oo_pshort', variant_id: 'ps_short', qty: 1, type: 'restock' });
      const full = await svc.getWithLines(o.id);
      const oosId = full.lines.find((l: any) => l.variant_id === 'ps_oos').id;

      const r = await api.post(`/pos/online-orders/${o.id}/partial`, { oos_line_ids: [oosId] }).catch((e: any) => e.response);
      expect(r.status).toBe(409);

      const after = await svc.getWithLines(o.id);
      expect(after.status).toBe('pending'); // not transitioned
      expect((await wms.getStock('v_oo_pshort', 'ps_short')).reserved).toBe(0); // no leaked reservation
    });

    it('accept with insufficient stock returns 409 and does not transition', async () => {
      const svc: any = getContainer().resolve('onlineOrderService');
      const o = await svc.createOrder({
        vendor_id: 'v_oo_short', total_minor: 1000,
        commission_rate_bps_snapshot: 700, commission_minor: 70,
        lines: [{ variant_id: 'short1', title: 'X', qty: 3, unit_price_minor: 1000, line_total_minor: 3000 }],
      });
      const wms: any = getContainer().resolve('wmsService');
      await wms.incrementStock({ vendor_id: 'v_oo_short', variant_id: 'short1', qty: 1, type: 'restock' });

      const r = await api.post(`/pos/online-orders/${o.id}/accept`, {}).catch((e: any) => e.response);
      expect(r.status).toBe(409);

      const after = await svc.getWithLines(o.id);
      expect(after.status).toBe('pending');
      const snap = await wms.getStock('v_oo_short', 'short1');
      expect(snap.reserved).toBe(0); // no partial reservation left behind
    });

    it('double accept is idempotent: 2nd call 409s and does not double-reserve', async () => {
      const svc: any = getContainer().resolve('onlineOrderService');
      const wms: any = getContainer().resolve('wmsService');
      const o = await svc.createOrder({
        vendor_id: 'v_oo_dbl', total_minor: 1000,
        commission_rate_bps_snapshot: 700, commission_minor: 70,
        lines: [{ variant_id: 'dbl1', title: 'X', qty: 2, unit_price_minor: 500, line_total_minor: 1000 }],
      });
      await wms.incrementStock({ vendor_id: 'v_oo_dbl', variant_id: 'dbl1', qty: 10, type: 'restock' });

      const first = await api.post(`/pos/online-orders/${o.id}/accept`, {});
      expect(first.status).toBe(200);
      expect((await wms.getStock('v_oo_dbl', 'dbl1')).reserved).toBe(2);

      const second = await api.post(`/pos/online-orders/${o.id}/accept`, {}).catch((e: any) => e.response);
      expect(second.status).toBe(409); // already accepted, not pending
      // Reservation count unchanged — the status guard prevented a duplicate reserve.
      expect((await wms.getStock('v_oo_dbl', 'dbl1')).reserved).toBe(2);
    });
  },
});
