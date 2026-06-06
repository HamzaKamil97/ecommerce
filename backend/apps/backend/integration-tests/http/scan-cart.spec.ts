import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    it('create → add → patch → send → by-code; edit after send 409', async () => {
      const cr = await api.post('/pos/scan-carts', { vendor_id: 'v_sc1', staff_id: 's1' });
      expect(cr.status).toBe(201);
      const cartId = cr.data.cart.id;

      const lr = await api.post(`/pos/scan-carts/${cartId}/lines`, {
        variant_id: 'va', title: 'A', qty: 1, unit_price_minor: 1000,
      });
      expect(lr.status).toBe(200);
      const lineId = lr.data.line.id;

      const pr = await api.patch(`/pos/scan-carts/${cartId}/lines/${lineId}`, { qty: 3 });
      expect(pr.status).toBe(200);

      const sr = await api.post(`/pos/scan-carts/${cartId}/send`, {});
      expect(sr.status).toBe(200);
      expect(sr.data.cart.status).toBe('PENDING_CASHIER');
      const code = sr.data.cart.short_code;
      expect(code).toMatch(/^[A-Z0-9]{6}$/);

      const gr = await api.get(`/pos/scan-carts/by-code/${code}`);
      expect(gr.status).toBe(200);
      expect(gr.data.cart.id).toBe(cartId);
      expect(gr.data.cart.lines.length).toBe(1);

      // edit after send → 409
      const after = await api
        .post(`/pos/scan-carts/${cartId}/lines`, { variant_id: 'vb', title: 'B', qty: 1, unit_price_minor: 1 })
        .catch((e: any) => e.response);
      expect(after.status).toBe(409);
    });

    it('by-code 404 for unknown', async () => {
      const r = await api.get('/pos/scan-carts/by-code/ZZZZZZ').catch((e: any) => e.response);
      expect(r.status).toBe(404);
    });

    it('lazy-expires a cart past expires_at → 410', async () => {
      const svc: any = getContainer().resolve('scanCartService');
      const c = await svc.createCart({ vendor_id: 'v_sc2', staff_id: 's1' });
      await svc.addLine(c.id, { variant_id: 'va', title: 'A', qty: 1, unit_price_minor: 100 });
      const locked = await svc.send(c.id);

      // force expiry in the past
      await svc.transition(c.id, 'PENDING_CASHIER', { expires_at: new Date(Date.now() - 1000) });

      const r = await api
        .get(`/pos/scan-carts/by-code/${locked.short_code}`)
        .catch((e: any) => e.response);
      expect(r.status).toBe(410);

      const reloaded = await svc.getWithLines(c.id);
      expect(reloaded.status).toBe('EXPIRED');
    });
  },
});
