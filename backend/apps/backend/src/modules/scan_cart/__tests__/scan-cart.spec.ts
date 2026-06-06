// backend/apps/backend/src/modules/scan_cart/__tests__/scan-cart.spec.ts
import { moduleIntegrationTestRunner } from '@medusajs/test-utils';
import { SCAN_CART_MODULE } from '..';
import { ScanCart } from '../models/scan-cart.model';
import { ScanCartLine } from '../models/scan-cart-line.model';
import path from 'path';

moduleIntegrationTestRunner({
  moduleName: SCAN_CART_MODULE,
  moduleModels: [ScanCart, ScanCartLine],
  resolve: path.join(__dirname, '..'),
  testSuite: ({ service }: any) => {
    describe('ScanCartService', () => {
      it('creates an OPEN cart, adds lines, locks with a short_code, finds by code', async () => {
        const c = await service.createCart({ vendor_id: 'v1', staff_id: 's1' });
        expect(c.status).toBe('OPEN');
        await service.addLine(c.id, { variant_id: 'va', title: 'A', qty: 2, unit_price_minor: 1000 });
        const locked = await service.send(c.id);
        expect(locked.status).toBe('PENDING_CASHIER');
        expect(locked.short_code).toMatch(/^[A-Z0-9]{5,6}$/);
        const found = await service.getByCode(locked.short_code);
        expect(found.id).toBe(c.id);
        expect(found.lines.length).toBe(1);
      });

      it('rejects edits once locked', async () => {
        const c = await service.createCart({ vendor_id: 'v1', staff_id: 's1' });
        await service.addLine(c.id, { variant_id: 'vb', title: 'B', qty: 1, unit_price_minor: 500 });
        await service.send(c.id);
        await expect(service.addLine(c.id, { variant_id: 'vc', title: 'C', qty: 1, unit_price_minor: 500 }))
          .rejects.toThrow(/not open/i);
      });
    });
  },
});
