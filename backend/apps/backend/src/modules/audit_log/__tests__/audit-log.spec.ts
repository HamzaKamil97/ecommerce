import { moduleIntegrationTestRunner } from '@medusajs/test-utils';
import { AUDIT_LOG_MODULE } from '..';
import { AuditLog } from '../models/audit-log.model';
import path from 'path';

moduleIntegrationTestRunner({
  moduleName: AUDIT_LOG_MODULE,
  moduleModels: [AuditLog],
  resolve: path.join(__dirname, '..'),
  testSuite: ({ service }: any) => {
    describe('AuditLogService', () => {
      it('ping returns ok', () => {
        expect(service.ping()).toBe('audit-log-ok');
      });

      it('writeAudit creates a row and returns it', async () => {
        const row = await service.writeAudit({
          vendor_id: 'v_test',
          actor_id: 'user_admin',
          actor_type: 'user',
          module: 'catalog',
          action: 'create',
          entity_id: 'prod_xyz',
          before_json: null,
          after_json: { title: 'Lurpak' },
          metadata: { ip: '127.0.0.1' },
        });
        expect(row.id).toMatch(/^aul_/);
        expect(row.vendor_id).toBe('v_test');
        expect(row.module).toBe('catalog');
        expect(row.action).toBe('create');
      });

      it('listAuditByVendor returns rows ordered newest first', async () => {
        await service.writeAudit({
          vendor_id: 'v_list', actor_id: 'u1', actor_type: 'user',
          module: 'wms', action: 'adjust',
        });
        await new Promise(r => setTimeout(r, 10));
        await service.writeAudit({
          vendor_id: 'v_list', actor_id: 'u1', actor_type: 'user',
          module: 'wms', action: 'adjust',
        });
        const rows = await service.listAuditByVendor('v_list');
        expect(rows.length).toBeGreaterThanOrEqual(2);
        const ts = rows.map((r: any) => new Date(r.created_at).getTime());
        expect(ts[0]).toBeGreaterThanOrEqual(ts[1]);
      });

      it('writeAudit accepts null vendor_id (platform event)', async () => {
        const row = await service.writeAudit({
          vendor_id: null, actor_id: null, actor_type: 'system',
          module: 'platform', action: 'other',
        });
        expect(row.vendor_id).toBeNull();
      });
    });
  },
});
