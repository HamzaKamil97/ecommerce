import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardScreen } from '../src/ui/screens/DashboardScreen';
import { useAdminSession } from '../src/state/session';

vi.mock('../src/api/reports', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    fetchSalesSummary: vi.fn(),
    fetchTopSkus: vi.fn(),
    fetchDriftAlerts: vi.fn(),
    fetchLowStock: vi.fn(),
  };
});

import * as reports from '../src/api/reports';

describe('DashboardScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminSession.setState({ token: 'tok', vendor_id: 'v_t' });
  });

  it('renders all three panels with data', async () => {
    vi.mocked(reports.fetchSalesSummary).mockResolvedValue({
      vendor_id: 'v_t', from: '', to: '', bucket: 'day',
      buckets: [{ bucket_at: '2026-05-01', sale_count: 1, revenue_minor: 1000 }],
    });
    vi.mocked(reports.fetchTopSkus).mockResolvedValue({
      vendor_id: 'v_t', items: [{ variant_id: 'v1', name_snapshot: 'Bread', units_sold: 5, revenue_minor: 5000, sale_count: 3 }],
    });
    vi.mocked(reports.fetchDriftAlerts).mockResolvedValue({ flagged: [] });
    vi.mocked(reports.fetchLowStock).mockResolvedValue({ vendor_id: 'v_t', threshold: 5, items: [] });

    render(<MemoryRouter><DashboardScreen /></MemoryRouter>);
    await waitFor(() => screen.getByText('Sales'));
    await waitFor(() => screen.getByText('Bread'));
    expect(screen.getByText('Top SKUs')).toBeTruthy();
    expect(screen.getByText('Alerts')).toBeTruthy();
  });
});
