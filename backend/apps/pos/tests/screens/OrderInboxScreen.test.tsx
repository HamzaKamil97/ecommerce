import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OrderInboxScreen } from '../../src/ui/screens/OrderInboxScreen';
import { useOrders } from '../../src/state/orders';

vi.mock('../../src/api/onlineOrders', () => ({
  listOrders: vi.fn(async (_v: string, status: string) => {
    if (status === 'pending') return [
      {
        id: 'HN-2026-0531',
        customer_name: 'Fatima Al-Sayed',
        customer_phone: '0770 123 4567',
        total_minor: 42750,
        currency_code: 'iqd',
        status: 'pending',
        placed_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),  // 8 min ago → urgent
        commission_rate_bps_snapshot: 700,
        commission_minor: 2992,
        vendor_id: 'v_test',
        customer_id: null,
        delivery_address: 'Karrada',
        delivery_lat: null,
        delivery_lng: null,
        voice_note_url: null,
        accepted_at: null,
        rejected_at: null,
        delivered_at: null,
      },
    ];
    return [];
  }),
  acceptOrder: vi.fn(async () => ({})),
  rejectOrder: vi.fn(async () => ({})),
  partialAcceptOrder: vi.fn(async () => ({ order: {}, oos_line_count: 0 })),
}));

beforeEach(() => {
  useOrders.setState({ pending: [], picking: [], done: [], loading: false, error: null });
});

describe('OrderInboxScreen', () => {
  it('renders pending tab by default and lists fetched orders', async () => {
    render(<MemoryRouter><OrderInboxScreen /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Fatima/)).toBeInTheDocument());
    expect(screen.getByText(/42,?750/)).toBeInTheDocument();
  });

  it('shows count badge on Pending tab', async () => {
    render(<MemoryRouter><OrderInboxScreen /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Fatima/)).toBeInTheDocument());
    // Pending tab should now show "1"
    const pendingTab = screen.getByRole('tab', { name: /Pending/i });
    expect(pendingTab.textContent).toMatch(/1/);
  });

  it('clicking Accept calls accept action with the order id', async () => {
    render(<MemoryRouter><OrderInboxScreen /></MemoryRouter>);
    await waitFor(() => screen.getByText(/Fatima/));
    const acceptSpy = vi.spyOn(useOrders.getState(), 'accept');
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    expect(acceptSpy).toHaveBeenCalled();
    // First arg is vendor_id, second is order id
    const firstCall = acceptSpy.mock.calls[0];
    expect(firstCall?.[1]).toBe('HN-2026-0531');
  });

  it('Done tab empty state shows "All caught up" copy', async () => {
    render(<MemoryRouter><OrderInboxScreen /></MemoryRouter>);
    await waitFor(() => screen.getByText(/Fatima/));
    fireEvent.click(screen.getByRole('tab', { name: /^Done/i }));
    expect(screen.getByText(/All caught up/i)).toBeInTheDocument();
  });

  it('urgent badge appears on pending order older than 5 min', async () => {
    render(<MemoryRouter><OrderInboxScreen /></MemoryRouter>);
    await waitFor(() => screen.getByText(/Fatima/));
    // The 8-min-old order should have URGENT styling. There's a filter chip
    // labeled "Urgent · >5min" too, so match the all-caps badge text on the card.
    expect(screen.getByText(/· URGENT/)).toBeInTheDocument();
  });
});
