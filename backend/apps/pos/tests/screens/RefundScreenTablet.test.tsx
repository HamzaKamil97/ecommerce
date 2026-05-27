import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RefundScreen } from '../../src/ui/screens/refund/RefundScreen';

vi.mock('../../src/api/refunds', () => ({
  processRefund: vi.fn(async () => ({
    refund_sale_id: 'pos_x',
    refund_total_minor: 22000,
    stock_damaged_units: 0,
    stock_returned_units: 1,
  })),
}));

vi.mock('../../src/api/sales', () => ({
  fetchSale: vi.fn(async (id: string) => ({
    id,
    lines: [
      { id: 'sl1', variant_id: 'v_rice', title: 'Basmati Rice 5kg', qty: 1, unit_price_minor: 22000 },
    ],
  })),
  fetchRecentSales: vi.fn(async () => []),
}));

describe('RefundScreen tablet', () => {
  it('single-screen flow: search → pick + reason → PIN → process', async () => {
    render(<RefundScreen onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/HN-LOC/i), { target: { value: 'HN-LOC-000240' } });
    fireEvent.click(screen.getByRole('button', { name: /^Lookup/i }));
    await waitFor(() => screen.getByText(/Basmati Rice/));

    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    fireEvent.click(screen.getByRole('button', { name: /Changed mind/i }));

    for (const d of '1234') fireEvent.click(screen.getByRole('button', { name: d }));

    fireEvent.click(screen.getByRole('button', { name: /Process refund/i }));
    await waitFor(() => expect(screen.getByText(/22,?000/)).toBeInTheDocument());
  });

  it('renders all section headers on single screen', () => {
    render(<RefundScreen onClose={() => {}} />);
    // Section 1: pick / lookup
    expect(screen.getByText(/Pick the sale/i)).toBeInTheDocument();
    // Section 2: method
    expect(screen.getByText(/Refund method/i)).toBeInTheDocument();
    // Section 3: PIN / Manager
    expect(screen.getByText(/Manager PIN/i)).toBeInTheDocument();
    // Summary
    expect(screen.getByText(/Summary/i)).toBeInTheDocument();
  });
});
