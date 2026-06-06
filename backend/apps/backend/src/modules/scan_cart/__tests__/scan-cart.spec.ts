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
        expect(locked.short_code).toMatch(/^[A-Z0-9]{6}$/);
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

      it('priceLine works on a PENDING_CASHIER cart, rejects on OPEN, and guards line ownership', async () => {
        const c = await service.createCart({ vendor_id: 'v1', staff_id: 's1' });
        const line = await service.addLine(c.id, { variant_id: 'vw', title: 'Loose', qty: 1, unit_price_minor: 0, weigh_at_counter: true });
        expect(line.priced).toBe(false);
        // OPEN cart: pricing is not allowed yet
        await expect(service.priceLine(c.id, line.id, 2000)).rejects.toThrow(/cannot price/i);
        await service.send(c.id);
        const priced = await service.priceLine(c.id, line.id, 2000);
        expect(priced.priced).toBe(true);
        expect(Number(priced.unit_price_minor)).toBe(2000);
        // ownership guard: a foreign line id is rejected
        await expect(service.priceLine(c.id, 'scl_foreign', 1000)).rejects.toThrow(/not in cart/i);
      });
    });
  },
});
