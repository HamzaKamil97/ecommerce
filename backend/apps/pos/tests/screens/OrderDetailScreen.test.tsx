import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrderDetailScreen } from '../../src/ui/screens/OrderDetailScreen';

vi.mock('../../src/api/onlineOrders', () => ({
  getOrder: vi.fn(async (id: string) => ({
    id,
    vendor_id: 'v_test',
    customer_id: 'c_1',
    customer_name: 'Ahmed Hussein',
    customer_phone: '+964 770 123 4567',
    total_minor: 38900,
    currency_code: 'iqd',
    status: 'picking',
    commission_rate_bps_snapshot: 700,
    commission_minor: 2723,
    delivery_address: 'Jadriya · Bld. 47, Apt. 5B',
    delivery_lat: 33.2856,
    delivery_lng: 44.3735,
    voice_note_url: null,
    placed_at: new Date().toISOString(),
    accepted_at: null,
    rejected_at: null,
    delivered_at: null,
    lines: [
      { id: 'l1', variant_id: 'v_rice', title: 'Basmati Rice 5kg · Tilda', qty: 1, unit_price_minor: 22000, line_total_minor: 22000, aisle_hint: 'Aisle 3 · B', picked: true, oos: false },
      { id: 'l2', variant_id: 'v_eggs', title: 'Eggs Tray · 30 ct', qty: 1, unit_price_minor: 7000, line_total_minor: 7000, aisle_hint: 'Cold · A', picked: true, oos: false },
      { id: 'l3', variant_id: 'v_yogurt', title: 'Yogurt 500g · Sara', qty: 4, unit_price_minor: 500, line_total_minor: 2000, aisle_hint: 'Cold · A', picked: false, oos: true },
      { id: 'l4', variant_id: 'v_tomatoes', title: 'Tomatoes 1kg · Local', qty: 2, unit_price_minor: 1200, line_total_minor: 2400, aisle_hint: 'Produce · F', picked: false, oos: false },
    ],
  })),
  handoffOrder: vi.fn(async () => ({})),
}));

function renderAtRoute(initialPath = '/orders/oo_test') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrderDetailScreen', () => {
  it('renders customer name + phone', async () => {
    renderAtRoute();
    await waitFor(() => expect(screen.getByText(/Ahmed Hussein/)).toBeInTheDocument());
    expect(screen.getByText(/770\s?123\s?4567/)).toBeInTheDocument();
  });

  it('renders all pick-list rows', async () => {
    renderAtRoute();
    await waitFor(() => screen.getByText(/Ahmed Hussein/));
    expect(screen.getByText(/Basmati Rice 5kg/)).toBeInTheDocument();
    expect(screen.getByText(/Eggs Tray/)).toBeInTheDocument();
    expect(screen.getByText(/Yogurt 500g/)).toBeInTheDocument();
    expect(screen.getByText(/Tomatoes 1kg/)).toBeInTheDocument();
  });

  it('shows the Hand to rider sticky button', async () => {
    renderAtRoute();
    await waitFor(() => screen.getByText(/Ahmed Hussein/));
    expect(screen.getByRole('button', { name: /Hand to rider/i })).toBeInTheDocument();
  });

  it('shows progress 2/4 (2 picked out of 4 lines)', async () => {
    renderAtRoute();
    await waitFor(() => screen.getByText(/Ahmed Hussein/));
    expect(screen.getByText(/2\s*\/\s*4/)).toBeInTheDocument();
  });

  it('OOS row has the strikethrough or oos flag', async () => {
    renderAtRoute();
    await waitFor(() => screen.getByText(/Ahmed Hussein/));
    const yogurtCell = screen.getByText(/Yogurt 500g/);
    expect(yogurtCell.className).toMatch(/oos/);
  });

  it('renders summary block with commission', async () => {
    renderAtRoute();
    await waitFor(() => screen.getByText(/Ahmed Hussein/));
    expect(screen.getByText(/commission/i)).toBeInTheDocument();
    expect(screen.getByText(/38,?177|net|vendor/i)).toBeInTheDocument();
  });
});
