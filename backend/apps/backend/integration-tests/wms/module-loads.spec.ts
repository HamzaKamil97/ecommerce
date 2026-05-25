import { MedusaContainer } from '@medusajs/types';
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WMS module', () => {
      let container: MedusaContainer;
      beforeAll(() => { container = getContainer(); });

      it('resolves wmsService from the container', () => {
        const svc = container.resolve('wmsService') as { ping: () => string };
        expect(svc).toBeDefined();
        expect(typeof svc.ping).toBe('function');
      });

      it('ping returns "wms-ok"', async () => {
        const svc = container.resolve('wmsService') as { ping: () => string };
        expect(svc.ping()).toBe('wms-ok');
      });
    });
  },
});
