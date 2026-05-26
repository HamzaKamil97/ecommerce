import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../src/api/client';
import { fetchSalesSummary, fetchTopSkus, fetchDriftAlerts, fetchLowStock } from '../src/api/reports';

describe('reports api', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('fetchSalesSummary calls /admin/reports/sales-summary with vendor + range', async () => {
    const spy = vi.spyOn(client, 'api').mockResolvedValue({ vendor_id: 'v', from: '', to: '', bucket: 'day', buckets: [] });
    await fetchSalesSummary('v', new Date('2026-01-01'), new Date('2026-01-31'), 'day');
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^\/admin\/reports\/sales-summary\?vendor_id=v/));
  });

  it('fetchTopSkus + fetchDriftAlerts + fetchLowStock URLs', async () => {
    const spy = vi.spyOn(client, 'api').mockResolvedValue({} as any);
    await fetchTopSkus('v', 20);
    await fetchDriftAlerts('v');
    await fetchLowStock('v', 5);
    expect(spy.mock.calls[0][0]).toMatch('/admin/reports/top-skus?vendor_id=v&limit=20');
    expect(spy.mock.calls[1][0]).toMatch('/admin/reports/drift-alerts?vendor_id=v');
    expect(spy.mock.calls[2][0]).toMatch('/admin/reports/low-stock?vendor_id=v&threshold=5');
  });
});
