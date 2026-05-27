// backend/apps/backend/src/modules/online_order/__tests__/online-order.spec.ts
import { moduleIntegrationTestRunner } from '@medusajs/test-utils';
import { ONLINE_ORDER_MODULE } from '..';
import { OnlineOrder } from '../models/online-order.model';
import { OnlineOrderLine } from '../models/online-order-line.model';
import path from 'path';

moduleIntegrationTestRunner({
  moduleName: ONLINE_ORDER_MODULE,
  moduleModels: [OnlineOrder, OnlineOrderLine],
  resolve: path.join(__dirname, '..'),
  testSuite: ({ service }: any) => {
    describe('OnlineOrderService', () => {
      it('ping', () => { expect(service.ping()).toBe('online-order-ok'); });

      it('createOrder with lines persists both', async () => {
        const order = await service.createOrder({
          vendor_id: 'v_create', customer_name: 'A', total_minor: 10000,
          commission_rate_bps_snapshot: 700, commission_minor: 700,
          lines: [{ variant_id: 'v1', title: 'X', qty: 2, unit_price_minor: 5000, line_total_minor: 10000 }],
        });
        expect(order.id).toMatch(/^oo_/);
        expect(order.status).toBe('pending');
        const full = await service.getWithLines(order.id);
        expect(full.lines.length).toBe(1);
        expect(full.lines[0].title).toBe('X');
      });

      it('listByStatus filters by status', async () => {
        const o1 = await service.createOrder({
          vendor_id: 'v_ls', total_minor: 1000, commission_rate_bps_snapshot: 700, commission_minor: 70,
          lines: [{ variant_id: 'v1', title: 'X', qty: 1, unit_price_minor: 1000, line_total_minor: 1000 }],
        });
        await service.transition(o1.id, 'accepted');
        const accepted = await service.listByStatus('v_ls', 'accepted');
        const pending = await service.listByStatus('v_ls', 'pending');
        expect(accepted.some((r: any) => r.id === o1.id)).toBe(true);
        expect(pending.some((r: any) => r.id === o1.id)).toBe(false);
      });

      it('transition to accepted stamps accepted_at', async () => {
        const o = await service.createOrder({
          vendor_id: 'v_acc', total_minor: 1, commission_rate_bps_snapshot: 700, commission_minor: 0,
          lines: [{ variant_id: 'v1', title: 'X', qty: 1, unit_price_minor: 1, line_total_minor: 1 }],
        });
        const after = await service.transition(o.id, 'accepted');
        expect(after.status).toBe('accepted');
        expect(after.accepted_at).toBeTruthy();
      });

      it('transition to rejected stamps rejected_at', async () => {
        const o = await service.createOrder({
          vendor_id: 'v_rej', total_minor: 1, commission_rate_bps_snapshot: 700, commission_minor: 0,
          lines: [{ variant_id: 'v1', title: 'X', qty: 1, unit_price_minor: 1, line_total_minor: 1 }],
        });
        const after = await service.transition(o.id, 'rejected');
        expect(after.status).toBe('rejected');
        expect(after.rejected_at).toBeTruthy();
      });

      it('markLinePicked toggles flag', async () => {
        const o = await service.createOrder({
          vendor_id: 'v_pick', total_minor: 1, commission_rate_bps_snapshot: 700, commission_minor: 0,
          lines: [{ variant_id: 'v1', title: 'X', qty: 1, unit_price_minor: 1, line_total_minor: 1 }],
        });
        const full = await service.getWithLines(o.id);
        const updated = await service.markLinePicked(full.lines[0].id, true);
        expect(updated.picked).toBe(true);
      });
    });
  },
});
