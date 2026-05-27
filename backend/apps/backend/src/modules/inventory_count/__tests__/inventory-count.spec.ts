// backend/apps/backend/src/modules/inventory_count/__tests__/inventory-count.spec.ts
import { moduleIntegrationTestRunner } from '@medusajs/test-utils';
import { INVENTORY_COUNT_MODULE } from '..';
import { CountSession } from '../models/count-session.model';
import { CountLine } from '../models/count-line.model';
import path from 'path';

moduleIntegrationTestRunner({
  moduleName: INVENTORY_COUNT_MODULE,
  moduleModels: [CountSession, CountLine],
  resolve: path.join(__dirname, '..'),
  testSuite: ({ service }: any) => {
    describe('InventoryCountService', () => {
      it('ping', () => { expect(service.ping()).toBe('inv-count-ok'); });

      it('openCount + addLine + listLines', async () => {
        const s = await service.openCount({ vendor_id: 'v', actor_id: 'a1', scope: 'department:dairy' });
        await service.addLine({ session_id: s.id, variant_id: 'v_milk', system_qty: 10, actual_qty: 8 });
        await service.addLine({ session_id: s.id, variant_id: 'v_butter', system_qty: 5, actual_qty: 5 });
        const lines = await service.listLines(s.id);
        expect(lines.length).toBe(2);
        expect(Number(lines.find((l: any) => l.variant_id === 'v_milk').delta)).toBe(-2);
        expect(Number(lines.find((l: any) => l.variant_id === 'v_butter').delta)).toBe(0);
      });

      it('cancel transitions to cancelled', async () => {
        const s = await service.openCount({ vendor_id: 'v', actor_id: 'a1', scope: 'all' });
        const c = await service.cancel(s.id);
        expect(c.status).toBe('cancelled');
      });

      it('applyCount on already-applied session rejects', async () => {
        const s = await service.openCount({ vendor_id: 'v', actor_id: 'a1', scope: 'all' });
        await service.cancel(s.id);
        await expect(service.applyCount({ session_id: s.id, actor_id: 'a1' }))
          .rejects.toMatchObject({ code: 'COUNT_NOT_OPEN' });
      });

      it('applyCount on missing session rejects', async () => {
        await expect(service.applyCount({ session_id: 'ics_nope', actor_id: 'a1' }))
          .rejects.toMatchObject({ code: 'COUNT_NOT_FOUND' });
      });
    });
  },
});
