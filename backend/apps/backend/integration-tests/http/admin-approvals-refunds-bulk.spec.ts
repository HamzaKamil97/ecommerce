/**
 * Integration tests for POST /admin/approvals/refunds/bulk
 *
 * New contract (P3-3): `refunds[]` is an array of `pos_refund_request.id`
 * strings. The route resolves each id, checks status === 'pending', calls
 * processReturn(request.payload) for approve, and markStatus for both.
 */
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { bootstrapAdmin } from '../helpers/admin';

/**
 * Helper: record a sale and return its sale_id + the first sale_line id.
 * processReturn needs a real original_sale_line_id to look up the name
 * snapshot (defensive — falls back to "refund:reason" on miss, but using
 * a real id keeps the test representative of production flow).
 */
async function seedSaleAndRefundRequest(
  pos: any,
  wms: any,
  refundSvc: any,
  opts: {
    vendor_id: string;
    variant_id: string;
    cashier_id: string;
    saleSuffix: string;
    reason?: string;
  },
) {
  const { vendor_id, variant_id, cashier_id, saleSuffix, reason = 'changed_mind' } = opts;

  // Ensure enough stock for the original sale (we need to decrement during sale)
  await wms.incrementStock({
    vendor_id, variant_id, qty: 10,
    type: 'restock', actor_id: 'seed',
  });

  // Record the original sale — this decrements stock
  const saleResult = await pos.recordSale({
    client_id: `sale_${saleSuffix}`,
    vendor_id,
    cashier_id,
    terminal_id: `t_${saleSuffix}`,
    lines: [{
      variant_id,
      qty: 1,
      unit_price_minor: 5000,
      name_snapshot: `Product ${saleSuffix}`,
    }],
    paid_amount_minor: 5000,
    currency_code: 'iqd',
    client_created_at: new Date().toISOString(),
  });
  const original_sale_id = saleResult.sale_id;

  // Fetch the original sale line id so processReturn can look up the name snapshot
  const [origLines] = await pos.listAndCountSaleLines({ sale_id: original_sale_id });
  const original_sale_line_id = origLines[0].id;

  // Build the processReturn payload
  const payload = {
    vendor_id,
    cashier_id,
    manager_id: cashier_id,
    terminal_id: `t_${saleSuffix}`,
    original_sale_id,
    client_id: `ref_${saleSuffix}`,
    method: 'cash' as const,
    lines: [{
      original_sale_line_id,
      variant_id,
      qty: 1,
      unit_price_minor: 5000,
      reason: reason as any,
    }],
  };

  // Create the pos_refund_request with this payload stored inside it
  const reqRow = await refundSvc.createRequest({
    vendor_id,
    original_sale_id,
    total_minor: 5000,
    reason,
    requested_by: cashier_id,
    requested_by_name: null,
    payload,
  });

  return { requestId: reqRow.id, original_sale_id };
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>;
    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer());
      adminHeaders = headers;
    });

    it('approve: resolves request id, calls processReturn, marks approved, restocks', async () => {
      const pos: any = getContainer().resolve('posTerminalService');
      const wms: any = getContainer().resolve('wmsService');
      const refundSvc: any = getContainer().resolve('pos_refund_request');

      const vendor_id = 'v_bulk_new_ok';
      const variant_id = 'vbulk_new_a';

      const cashier = await pos.createCashier({
        vendor_id, name: 'Mgr', pin: '0000', role: 'manager',
      });

      const { requestId } = await seedSaleAndRefundRequest(pos, wms, refundSvc, {
        vendor_id,
        variant_id,
        cashier_id: cashier.id,
        saleSuffix: 'new_ok_1',
        reason: 'changed_mind',
      });

      // Stock after the original sale: 10 seeded - 1 sold = 9
      const stockBefore = await wms.getStock(vendor_id, variant_id);
      expect(Number(stockBefore.on_hand)).toBe(9);

      const r = await api.post(
        '/admin/approvals/refunds/bulk',
        { refunds: [requestId], decision: 'approve', approver_id: 'owner' },
        { headers: adminHeaders },
      );

      expect(r.status).toBe(200);
      expect(r.data.processed).toBe(1);
      expect(r.data.failed).toEqual([]);
      expect(Array.isArray(r.data.results)).toBe(true);
      expect(r.data.results.length).toBe(1);

      // Stock restored: 9 + 1 = 10
      const stockAfter = await wms.getStock(vendor_id, variant_id);
      expect(Number(stockAfter.on_hand)).toBe(10);

      // Request status must be 'approved'
      const rows = await refundSvc.listPosRefundRequests({ id: requestId });
      expect(rows[0].status).toBe('approved');
      expect(rows[0].approved_by).toBe('owner');
    });

    it('decline: marks declined, does NOT call processReturn (no stock change)', async () => {
      const pos: any = getContainer().resolve('posTerminalService');
      const wms: any = getContainer().resolve('wmsService');
      const refundSvc: any = getContainer().resolve('pos_refund_request');

      const vendor_id = 'v_bulk_new_decline';
      const variant_id = 'vbulk_new_dec';

      const cashier = await pos.createCashier({
        vendor_id, name: 'Mgr', pin: '0000', role: 'manager',
      });

      const { requestId } = await seedSaleAndRefundRequest(pos, wms, refundSvc, {
        vendor_id,
        variant_id,
        cashier_id: cashier.id,
        saleSuffix: 'new_dec_1',
        reason: 'damaged',
      });

      // Stock after the original sale: 10 - 1 = 9
      const stockBefore = await wms.getStock(vendor_id, variant_id);
      expect(Number(stockBefore.on_hand)).toBe(9);

      const r = await api.post(
        '/admin/approvals/refunds/bulk',
        { refunds: [requestId], decision: 'decline', approver_id: 'owner' },
        { headers: adminHeaders },
      );

      expect(r.status).toBe(200);
      expect(r.data.processed).toBe(1);
      expect(r.data.failed).toEqual([]);

      // Stock unchanged — processReturn was NOT called (damaged won't restock anyway,
      // but the point is no refund sale was created either)
      const stockAfter = await wms.getStock(vendor_id, variant_id);
      expect(Number(stockAfter.on_hand)).toBe(9);

      // Request status must be 'declined'
      const rows = await refundSvc.listPosRefundRequests({ id: requestId });
      expect(rows[0].status).toBe('declined');
      expect(rows[0].approved_by).toBe('owner');
    });

    it('409 rollback: rolls back already-approved items + reverts their status to pending', async () => {
      const pos: any = getContainer().resolve('posTerminalService');
      const wms: any = getContainer().resolve('wmsService');
      const refundSvc: any = getContainer().resolve('pos_refund_request');

      const vendor_id = 'v_bulk_new_rb';
      const variant_id = 'vbulk_new_rb_good';

      const cashier = await pos.createCashier({
        vendor_id, name: 'Mgr', pin: '0000', role: 'manager',
      });

      // Good request: real sale + valid payload
      const { requestId: goodId } = await seedSaleAndRefundRequest(pos, wms, refundSvc, {
        vendor_id,
        variant_id,
        cashier_id: cashier.id,
        saleSuffix: 'rb_good',
        reason: 'changed_mind',
      });

      // Bad request: manually create a request whose payload has empty lines
      // → processReturn will throw 'no lines to refund'
      const badReqRow = await refundSvc.createRequest({
        vendor_id,
        original_sale_id: 'sale_rb_bad',
        total_minor: 100,
        reason: 'other',
        requested_by: cashier.id,
        requested_by_name: null,
        payload: {
          vendor_id,
          cashier_id: cashier.id,
          manager_id: cashier.id,
          terminal_id: 't_rb',
          original_sale_id: 'sale_rb_bad',
          client_id: 'ref_rb_bad',
          method: 'cash',
          lines: [], // triggers InvalidRefundError
        },
      });

      // Stock before: 10 seeded - 1 sold = 9
      const stockBefore = await wms.getStock(vendor_id, variant_id);
      expect(Number(stockBefore.on_hand)).toBe(9);

      const r = await api.post(
        '/admin/approvals/refunds/bulk',
        { refunds: [goodId, badReqRow.id], decision: 'approve', approver_id: 'owner' },
        { headers: adminHeaders },
      ).catch((e: any) => e.response);

      expect(r.status).toBe(409);
      expect(r.data.error).toMatch(/rolled back/i);
      expect(r.data.processed_before_failure).toBe(1);

      // Stock must be back to 9 — the good refund's restock was compensated
      const stockAfter = await wms.getStock(vendor_id, variant_id);
      expect(Number(stockAfter.on_hand)).toBe(9);

      // Good request status reverted back to 'pending'
      const goodRows = await refundSvc.listPosRefundRequests({ id: goodId });
      expect(goodRows[0].status).toBe('pending');
    });

    it('rejects empty refunds array with 400', async () => {
      const r = await api.post(
        '/admin/approvals/refunds/bulk',
        { refunds: [], decision: 'approve', approver_id: 'a1' },
        { headers: adminHeaders },
      ).catch((e: any) => e.response);
      expect(r.status).toBe(400);
      expect(r.data.error).toMatch(/non-empty/i);
    });

    it('409 when a request id does not exist', async () => {
      const r = await api.post(
        '/admin/approvals/refunds/bulk',
        { refunds: ['nonexistent-id-xyz'], decision: 'approve', approver_id: 'owner' },
        { headers: adminHeaders },
      ).catch((e: any) => e.response);
      expect(r.status).toBe(409);
      expect(r.data.error).toMatch(/rolled back/i);
    });

    it('409 when a request is already approved (not pending)', async () => {
      const pos: any = getContainer().resolve('posTerminalService');
      const wms: any = getContainer().resolve('wmsService');
      const refundSvc: any = getContainer().resolve('pos_refund_request');

      const vendor_id = 'v_bulk_notpending';
      const variant_id = 'vbulk_notpend';
      const cashier = await pos.createCashier({
        vendor_id, name: 'Mgr', pin: '0000', role: 'manager',
      });

      const { requestId } = await seedSaleAndRefundRequest(pos, wms, refundSvc, {
        vendor_id, variant_id, cashier_id: cashier.id,
        saleSuffix: 'notpend', reason: 'changed_mind',
      });

      // Pre-mark as approved so it's no longer pending
      await refundSvc.markStatus(requestId, 'approved', 'pre_owner', new Date());

      const r = await api.post(
        '/admin/approvals/refunds/bulk',
        { refunds: [requestId], decision: 'approve', approver_id: 'owner' },
        { headers: adminHeaders },
      ).catch((e: any) => e.response);

      expect(r.status).toBe(409);
      expect(r.data.error).toMatch(/rolled back/i);
    });
  },
});
