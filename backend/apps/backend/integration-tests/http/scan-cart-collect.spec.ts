import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    it('collects: prices weigh line, records sale, decrements WMS, cart PAID', async () => {
      const cart: any = getContainer().resolve('scanCartService');
      const wms: any = getContainer().resolve('wmsService');
      const c = await cart.createCart({ vendor_id: 'v_col', staff_id: 's1' });
      await cart.addLine(c.id, { variant_id: 'va', title: 'A', qty: 2, unit_price_minor: 1000 });          // normal
      const wline = await cart.addLine(c.id, { variant_id: 'vw', title: 'Loose', qty: 1, unit_price_minor: 0, weigh_at_counter: true }); // weigh, priced=false
      await wms.incrementStock({ vendor_id: 'v_col', variant_id: 'va', qty: 10, type: 'restock' });
      await wms.incrementStock({ vendor_id: 'v_col', variant_id: 'vw', qty: 10, type: 'restock' });
      await cart.send(c.id);

      const r = await api.post(`/pos/scan-carts/${c.id}/collect`, {
        cashier_id: 'cash1', terminal_id: 't1',
        priced_lines: [{ line_id: wline.id, unit_price_minor: 2500 }],
        paid_amount_minor: 4500,
      });
      expect(r.status).toBe(200);
      expect(r.data.cart.status).toBe('PAID');
      expect(r.data.cart.paid_sale_id).toBeTruthy();
      expect((await wms.getStock('v_col', 'va')).on_hand).toBe(8);   // 10 - 2
      expect((await wms.getStock('v_col', 'vw')).on_hand).toBe(9);   // 10 - 1
    });

    it('rejects collect on a non-PENDING_CASHIER cart (409)', async () => {
      const cart: any = getContainer().resolve('scanCartService');
      const c = await cart.createCart({ vendor_id: 'v_col2', staff_id: 's1' });
      await cart.addLine(c.id, { variant_id: 'va', title: 'A', qty: 1, unit_price_minor: 1000 });
      // still OPEN, not sent
      const r = await api.post(`/pos/scan-carts/${c.id}/collect`, { cashier_id: 'c', terminal_id: 't', priced_lines: [], paid_amount_minor: 1000 }).catch((e: any) => e.response);
      expect(r.status).toBe(409);
    });

    it('400 when a weigh line is left unpriced', async () => {
      const cart: any = getContainer().resolve('scanCartService');
      const wms: any = getContainer().resolve('wmsService');
      const c = await cart.createCart({ vendor_id: 'v_col3', staff_id: 's1' });
      await cart.addLine(c.id, { variant_id: 'vw', title: 'Loose', qty: 1, unit_price_minor: 0, weigh_at_counter: true });
      await wms.incrementStock({ vendor_id: 'v_col3', variant_id: 'vw', qty: 5, type: 'restock' });
      await cart.send(c.id);
      const r = await api.post(`/pos/scan-carts/${c.id}/collect`, { cashier_id: 'c', terminal_id: 't', priced_lines: [], paid_amount_minor: 0 }).catch((e: any) => e.response);
      expect(r.status).toBe(400);
    });
  },
});
