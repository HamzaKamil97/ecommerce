import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.shopsWithinRadius', () => {
      it('returns only shops within Haversine distance', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.upsertShopLocation({
          vendor_id: 'v_near', lat: 33.3152, lng: 44.3661,
          delivery_radius_km: 5, address_text: 'Karrada',
        });
        await svc.upsertShopLocation({
          vendor_id: 'v_far', lat: 36.1901, lng: 44.0096,
          delivery_radius_km: 5, address_text: 'Erbil',
        });
        const near = await svc.shopsWithinRadius({ lat: 33.3152, lng: 44.3661, radius_km: 10 });
        const ids = near.map((s: any) => s.vendor_id);
        expect(ids).toContain('v_near');
        expect(ids).not.toContain('v_far');
      });

      it("respects each shop's own delivery_radius_km (customer outside shop radius excluded)", async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.upsertShopLocation({
          vendor_id: 'v_tight', lat: 33.3152, lng: 44.3661,
          delivery_radius_km: 1, address_text: 'Tight Shop',
        });
        // Customer ~5 km away (rough estimate, lat+0.045)
        const near = await svc.shopsWithinRadius({ lat: 33.36, lng: 44.40, radius_km: 50 });
        const ids = near.map((s: any) => s.vendor_id);
        expect(ids).not.toContain('v_tight');
      });

      it('upsert is idempotent: second call updates lat/lng', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.upsertShopLocation({
          vendor_id: 'v_idem', lat: 33.0, lng: 44.0, delivery_radius_km: 5,
        });
        await svc.upsertShopLocation({
          vendor_id: 'v_idem', lat: 33.5, lng: 44.5, delivery_radius_km: 10, address_text: 'Updated',
        });
        const rows = await svc.listShopLocations({ vendor_id: 'v_idem' });
        expect(rows.length).toBe(1);
        expect(Number(rows[0].lat)).toBeCloseTo(33.5);
        expect(Number(rows[0].delivery_radius_km)).toBeCloseTo(10);
      });

      it('returns distance_km in result and sorts ascending', async () => {
        const svc = getContainer().resolve('wmsService') as any;
        await svc.upsertShopLocation({ vendor_id: 'v_sort1', lat: 33.3152, lng: 44.3661, delivery_radius_km: 50 });
        await svc.upsertShopLocation({ vendor_id: 'v_sort2', lat: 33.32, lng: 44.37, delivery_radius_km: 50 });
        const near = await svc.shopsWithinRadius({ lat: 33.3152, lng: 44.3661, radius_km: 50 });
        const sortIds = near.filter((s: any) => s.vendor_id.startsWith('v_sort')).map((s: any) => s.vendor_id);
        // v_sort1 is exactly at the point, v_sort2 is a bit further
        expect(sortIds[0]).toBe('v_sort1');
        expect(near.find((s: any) => s.vendor_id === 'v_sort1').distance_km).toBeCloseTo(0, 1);
        expect(near.find((s: any) => s.vendor_id === 'v_sort2').distance_km).toBeGreaterThan(0);
      });
    });
  },
});
