// NOTE: this is a thin test — full happy-path with wms increment is in the HTTP test.
// The module test container doesn't have wms wired the same way as full Medusa boot,
// so only the validation branches are exercised here.
import path from 'path';
import { moduleIntegrationTestRunner } from '@medusajs/test-utils';
import { POS_TERMINAL_MODULE } from '..';
import { Sale } from '../models/sale.model';
import { SaleLine } from '../models/sale-line.model';
import { Cashier } from '../models/cashier.model';

moduleIntegrationTestRunner({
  moduleName: POS_TERMINAL_MODULE,
  moduleModels: [Sale, SaleLine, Cashier],
  resolve: path.join(__dirname, '..'),
  testSuite: ({ service }: any) => {
    describe('processReturn — validation', () => {
      it('rejects empty lines array', async () => {
        await expect(service.processReturn({
          vendor_id: 'v', cashier_id: 'c', manager_id: 'm', terminal_id: 't',
          original_sale_id: 's', lines: [], method: 'cash', client_id: 'cl1',
        })).rejects.toThrow(/no lines/);
      });

      it('rejects negative qty', async () => {
        await expect(service.processReturn({
          vendor_id: 'v', cashier_id: 'c', manager_id: 'm', terminal_id: 't',
          original_sale_id: 's', client_id: 'cl2', method: 'cash',
          lines: [{ original_sale_line_id: 'sl1', variant_id: 'v1', qty: -1, unit_price_minor: 100, reason: 'changed_mind' }],
        })).rejects.toMatchObject({ code: 'INVALID_REFUND' });
      });

      it('rejects negative price', async () => {
        await expect(service.processReturn({
          vendor_id: 'v', cashier_id: 'c', manager_id: 'm', terminal_id: 't',
          original_sale_id: 's', client_id: 'cl3', method: 'cash',
          lines: [{ original_sale_line_id: 'sl1', variant_id: 'v1', qty: 1, unit_price_minor: -100, reason: 'changed_mind' }],
        })).rejects.toMatchObject({ code: 'INVALID_REFUND' });
      });
    });
  },
});
