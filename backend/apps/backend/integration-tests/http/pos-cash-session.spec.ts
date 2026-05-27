import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    it('opens then closes a cash session and writes audit', async () => {
      // Create a cashier so the close route can pass permission check
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_cs_http', name: 'Ali', pin: '1234', role: 'cashier',
      });

      const openR = await api.post('/pos/cash-session/open', {
        vendor_id: 'v_cs_http', terminal_id: 'term_http_a', cashier_id: cashier.id,
        opening_float_minor: 50000,
      });
      expect(openR.status).toBe(200);
      const session_id = openR.data.session.id;
      expect(session_id).toMatch(/^cs_/);

      // Audit row must exist. The auditLogMiddleware derives `module` from the
      // 2nd path segment, so for /pos/cash-session/open module === 'cash-session'.
      const auditSvc: any = getContainer().resolve('auditLogService');
      await new Promise(r => setTimeout(r, 200));
      const audits = await auditSvc.listAuditByVendor('v_cs_http');
      expect(audits.some((a: any) => a.action === 'create' && a.module === 'cash-session')).toBe(true);

      const closeR = await api.post('/pos/cash-session/close',
        {
          session_id, cashier_id: cashier.id,
          counted_total_minor: 50500,
          denomination_count: { '50000': 1, '250': 2 },
          note: 'over by 500',
        },
        { headers: { 'x-cashier-id': cashier.id } },
      );
      expect(closeR.status).toBe(200);
      expect(closeR.data.session.status).toBe('closed');
      expect(Number(closeR.data.session.diff_minor)).toBe(500);

      // The close route sets req.audit_context = { vendor_id } so the audit
      // row is attributed to v_cs_http even though the close body carries
      // only session_id (no vendor_id). Without the audit_context fix the
      // close row would have vendor_id=null and would not surface here.
      await new Promise(r => setTimeout(r, 200));
      const auditsAfterClose = await auditSvc.listAuditByVendor('v_cs_http');
      const closeAudit = auditsAfterClose.find(
        (a: any) =>
          a.module === 'cash-session' &&
          a.action === 'create' &&
          a.metadata?.path === '/pos/cash-session/close',
      );
      expect(closeAudit).toBeTruthy();
    });

    it('rejects opening a second session on same terminal with 409', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_cs_2', name: 'Sara', pin: '1234', role: 'cashier',
      });
      const first = await api.post('/pos/cash-session/open', {
        vendor_id: 'v_cs_2', terminal_id: 'term_dup', cashier_id: cashier.id,
        opening_float_minor: 50000,
      });
      expect(first.status).toBe(200);
      const second = await api.post('/pos/cash-session/open', {
        vendor_id: 'v_cs_2', terminal_id: 'term_dup', cashier_id: cashier.id,
        opening_float_minor: 50000,
      }).catch((e: any) => e.response);
      expect(second.status).toBe(409);
      expect(second.data.code).toBe('CASH_SESSION_OPEN_EXISTS');
    });

    it('close route enforces pos.end_of_day capability — 403 when denied', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      // Create a cashier, then strip pos.end_of_day via permission_overrides
      const denied = await posSvc.createCashier({
        vendor_id: 'v_cs_deny', name: 'Noor', pin: '1234', role: 'cashier',
      });
      const { ContainerRegistrationKeys } = await import('@medusajs/framework/utils');
      const pg: any = (getContainer() as any).resolve(ContainerRegistrationKeys.PG_CONNECTION);
      await pg.raw(
        `UPDATE pos_cashier SET permission_overrides = '{"pos.end_of_day":false}'::jsonb WHERE id = ?`,
        [denied.id],
      );

      // Open a session first as another cashier (allowed)
      const openR = await api.post('/pos/cash-session/open', {
        vendor_id: 'v_cs_deny', terminal_id: 'term_deny', cashier_id: denied.id,
        opening_float_minor: 10000,
      });
      expect(openR.status).toBe(200);
      const session_id = openR.data.session.id;

      // Now try to close with the denied cashier in the header
      const closeR = await api.post('/pos/cash-session/close',
        {
          session_id, cashier_id: denied.id,
          counted_total_minor: 10000, denomination_count: {},
        },
        { headers: { 'x-cashier-id': denied.id } },
      ).catch((e: any) => e.response);
      expect(closeR.status).toBe(403);
      expect(closeR.data.code).toBe('PERMISSION_DENIED');
    });

    it('current returns the open session for a terminal', async () => {
      const posSvc: any = getContainer().resolve('posTerminalService');
      const cashier = await posSvc.createCashier({
        vendor_id: 'v_cs_3', name: 'Ahmed', pin: '1234', role: 'cashier',
      });
      const openR = await api.post('/pos/cash-session/open', {
        vendor_id: 'v_cs_3', terminal_id: 'term_current', cashier_id: cashier.id,
        opening_float_minor: 25000,
      });
      const r = await api.get(`/pos/cash-session/current?terminal_id=term_current`);
      expect(r.status).toBe(200);
      expect(r.data.session.id).toBe(openR.data.session.id);
    });
  },
});
