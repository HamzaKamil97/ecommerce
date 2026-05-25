import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { PosTerminalBadPinError } from '../../src/modules/pos_terminal/errors';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('cashier PIN', () => {
      it('creates a cashier and verifies their PIN', async () => {
        const svc: any = getContainer().resolve('posTerminalService');
        const c = await svc.createCashier({
          vendor_id: 'v_pin1', name: 'Ahmad', pin: '1234', role: 'cashier',
        });
        expect(c.id).toMatch(/^psc_/);
        const ok = await svc.verifyCashierPin(c.id, '1234');
        expect(ok.name).toBe('Ahmad');
      });
      it('rejects a bad PIN', async () => {
        const svc: any = getContainer().resolve('posTerminalService');
        const c = await svc.createCashier({
          vendor_id: 'v_pin2', name: 'Sara', pin: '9999', role: 'manager',
        });
        await expect(svc.verifyCashierPin(c.id, '0000'))
          .rejects.toBeInstanceOf(PosTerminalBadPinError);
      });
      it('listCashiers returns pin_hash_prefix not the hash', async () => {
        const svc: any = getContainer().resolve('posTerminalService');
        await svc.createCashier({ vendor_id: 'v_list', name: 'A', pin: '1111', role: 'cashier' });
        const list = await svc.listCashiers('v_list');
        expect(list[0].pin_hash_prefix).toMatch(/^[a-f0-9]{8}$/);
        expect((list[0] as any).pin_hash).toBeUndefined();
      });
    });
  },
});
