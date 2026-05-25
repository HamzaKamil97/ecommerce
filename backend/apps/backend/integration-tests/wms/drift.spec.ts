import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.detectStockDrift', () => {
      it('flags rows where on_hand < 0 or reserved > on_hand', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService') as any;
        const pg: any = (svc as any).__container__["__pg_connection__"];
        // Seed three rows via raw SQL (bypasses Medusa validation)
        const mkRow = async (id: string, variant: string, onHand: number, reserved: number) => {
          await pg.raw(
            `INSERT INTO wms_stock_pool
               (id, vendor_id, variant_id, on_hand_qty, raw_on_hand_qty,
                reserved_qty, raw_reserved_qty, created_at, updated_at)
             VALUES (?, 'v_drift', ?, ?::numeric, jsonb_build_object('value', ?::text),
                     ?::numeric, jsonb_build_object('value', ?::text), NOW(), NOW())`,
            [id, variant, onHand, String(onHand), reserved, String(reserved)],
          );
        };
        await mkRow('sp_drift_a', 'var_a', -1, 0);
        await mkRow('sp_drift_b', 'var_b', 5, 7);
        await mkRow('sp_drift_c', 'var_c', 5, 2);

        const report = await svc.detectStockDrift({ vendor_id: 'v_drift' });
        const flagged = report.flagged;
        const byVariant: Record<string, any> = {};
        for (const f of flagged) byVariant[f.variant_id] = f;
        expect(byVariant['var_a']).toBeDefined();
        expect(byVariant['var_a'].flag).toBe('negative_on_hand');
        expect(byVariant['var_b']).toBeDefined();
        expect(byVariant['var_b'].flag).toBe('reserved_exceeds_on_hand');
        expect(byVariant['var_c']).toBeUndefined();
      });

      it('returns empty flagged when vendor scope has no drift', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.incrementStock({ vendor_id: 'v_clean', variant_id: 'var_x', qty: 10, type: 'restock' });
        const report = await svc.detectStockDrift({ vendor_id: 'v_clean' });
        expect(report.flagged.length).toBe(0);
      });
    });
  },
});
