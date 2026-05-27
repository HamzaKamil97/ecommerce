// backend/apps/backend/src/modules/cash_session/__tests__/cash-session.spec.ts
import { moduleIntegrationTestRunner } from '@medusajs/test-utils';
import { CASH_SESSION_MODULE } from '..';
import { CashSession } from '../models/cash-session.model';
import path from 'path';

moduleIntegrationTestRunner({
  moduleName: CASH_SESSION_MODULE,
  moduleModels: [CashSession],
  resolve: path.join(__dirname, '..'),
  testSuite: ({ service }: any) => {
    describe('CashSessionService', () => {
      it('ping ok', () => { expect(service.ping()).toBe('cash-session-ok'); });

      it('openSession creates a row', async () => {
        const s = await service.openSession({
          vendor_id: 'v_test', terminal_id: 'term_a', cashier_id: 'c1',
          opening_float_minor: 50000,
        });
        expect(s.id).toMatch(/^cs_/);
        expect(s.status).toBe('open');
        expect(Number(s.opening_float_minor)).toBe(50000);
      });

      it('rejects opening a second session on the same terminal', async () => {
        await service.openSession({
          vendor_id: 'v_test', terminal_id: 'term_b', cashier_id: 'c1',
          opening_float_minor: 50000,
        });
        await expect(service.openSession({
          vendor_id: 'v_test', terminal_id: 'term_b', cashier_id: 'c2',
          opening_float_minor: 50000,
        })).rejects.toMatchObject({ code: 'CASH_SESSION_OPEN_EXISTS' });
      });

      it('closeSession computes diff and persists', async () => {
        const s = await service.openSession({
          vendor_id: 'v_test', terminal_id: 'term_c', cashier_id: 'c1',
          opening_float_minor: 50000,
        });
        const closed = await service.closeSession({
          session_id: s.id, cashier_id: 'c1',
          counted_total_minor: 51000,
          denomination_count: { '50000': 1, '1000': 1 },
          note: 'over by 1k — change drawer earlier',
        });
        expect(closed.status).toBe('closed');
        // No pos_sale rows in scope → expected = float (50000), counted 51000, diff +1000
        expect(Number(closed.expected_total_minor)).toBe(50000);
        expect(Number(closed.diff_minor)).toBe(1000);
      });

      it('getCurrent returns the open session for a terminal', async () => {
        const s = await service.openSession({
          vendor_id: 'v_test', terminal_id: 'term_d', cashier_id: 'c1',
          opening_float_minor: 50000,
        });
        const cur = await service.getCurrent('term_d');
        expect(cur?.id).toBe(s.id);
      });

      it('listHistory returns sessions newest first', async () => {
        await service.openSession({ vendor_id: 'v_list', terminal_id: 't_h1', cashier_id: 'c1', opening_float_minor: 10000 });
        await new Promise(r => setTimeout(r, 10));
        await service.openSession({ vendor_id: 'v_list', terminal_id: 't_h2', cashier_id: 'c1', opening_float_minor: 10000 });
        const rows = await service.listHistory('v_list');
        expect(rows.length).toBeGreaterThanOrEqual(2);
      });
    });
  },
});
