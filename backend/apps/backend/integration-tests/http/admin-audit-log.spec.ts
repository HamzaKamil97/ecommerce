import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { bootstrapAdmin } from '../helpers/admin';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>;
    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer());
      adminHeaders = headers;
    });

    it('lists audit rows filtered by actor + module + paginates', async () => {
      const audit: any = getContainer().resolve('auditLogService');
      for (let i = 0; i < 5; i++) {
        await audit.writeAudit({
          vendor_id: 'v_audit_test', actor_id: 'cashier_hala',
          actor_type: 'cashier', module: 'pos_terminal',
          action: i % 2 === 0 ? 'create' : 'update',
          entity_id: `sale_${i}`, before_json: null, after_json: { n: i },
        });
      }
      const r = await api.get(
        '/admin/audit-log?vendor_id=v_audit_test&actor_id=cashier_hala&module=pos_terminal&limit=10',
        { headers: adminHeaders },
      );
      expect(r.status).toBe(200);
      expect(r.data.rows.length).toBe(5);
      expect(r.data.total).toBe(5);
      expect(r.data.rows[0].action).toBeDefined();
    });

    it('export.csv streams rows respecting the same filters', async () => {
      const audit: any = getContainer().resolve('auditLogService');
      await audit.writeAudit({
        vendor_id: 'v_audit_csv', actor_id: 'a1', actor_type: 'user',
        module: 'catalog', action: 'create', entity_id: 'p_1',
        before_json: null, after_json: { title: 'Milk' },
      });
      const r = await api.get(
        '/admin/audit-log/export.csv?vendor_id=v_audit_csv',
        { headers: adminHeaders },
      );
      expect(r.status).toBe(200);
      expect(r.headers['content-type']).toMatch(/text\/csv/);
      const lines = (r.data as string).trim().split('\n');
      expect(lines[0]).toMatch(/^created_at,vendor_id,actor_id,actor_type,module,action,entity_id/);
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[1]).toContain('v_audit_csv');
    });

    it('rejects request without vendor_id', async () => {
      const r = await api.get('/admin/audit-log', { headers: adminHeaders }).catch((e: any) => e.response);
      expect(r.status).toBe(400);
    });
  },
});
