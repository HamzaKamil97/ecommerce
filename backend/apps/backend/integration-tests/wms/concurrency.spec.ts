import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

jest.setTimeout(120_000);

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('Concurrency: atomic decrement under race', () => {
      it('only one of two concurrent decrements succeeds when 1 unit remains', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.incrementStock({
          vendor_id: 'v_race', variant_id: 'var_last',
          qty: 1, type: 'restock',
        });

        const attempt = () => svc.decrementStock({
          vendor_id: 'v_race', variant_id: 'var_last', qty: 1, type: 'sale',
          source_id: `concurrent_${Math.random()}`,
        });

        const results = await Promise.allSettled([attempt(), attempt()]);
        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');
        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(1);
        const rejReason = (rejected[0] as PromiseRejectedResult).reason;
        expect(rejReason.name).toBe('WmsInsufficientStockError');

        const final = await svc.getStock('v_race', 'var_last');
        expect(final.on_hand).toBe(0);
        expect(final.available).toBe(0);
      });

      it('100 concurrent decrements of 1 unit each on 50 stock -> exactly 50 succeed / 50 fail', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.incrementStock({
          vendor_id: 'v_race2', variant_id: 'var_batch',
          qty: 50, type: 'restock',
        });

        const promises = Array.from({ length: 100 }).map((_, i) =>
          svc.decrementStock({
            vendor_id: 'v_race2', variant_id: 'var_batch', qty: 1, type: 'sale',
            source_id: `batch_${i}`,
          }).then(() => ({ ok: true as const }))
            .catch((e: any) => ({ ok: false as const, name: e?.name ?? 'Unknown' })),
        );
        const results = await Promise.all(promises);
        const ok = results.filter((r) => r.ok);
        const fail = results.filter((r) => !r.ok && (r as any).name === 'WmsInsufficientStockError');
        const other = results.filter((r) => !r.ok && (r as any).name !== 'WmsInsufficientStockError');
        expect(ok.length).toBe(50);
        expect(fail.length).toBe(50);
        expect(other.length).toBe(0); // any other error type would be a bug

        const final = await svc.getStock('v_race2', 'var_batch');
        expect(final.on_hand).toBe(0);
      });
    });
  },
});
