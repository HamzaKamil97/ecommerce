import { MedusaContainer } from '@medusajs/types';
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('pos_terminal module', () => {
      let container: MedusaContainer;
      beforeAll(() => { container = getContainer(); });

      it('resolves posTerminalService', () => {
        const svc = container.resolve('posTerminalService');
        expect(svc).toBeDefined();
        expect(typeof svc.ping).toBe('function');
      });

      it('ping returns "pos-terminal-ok"', () => {
        const svc = container.resolve('posTerminalService') as { ping: () => string };
        expect(svc.ping()).toBe('pos-terminal-ok');
      });
    });
  },
});
