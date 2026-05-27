import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RefundFlowPhone } from '../../src/ui/screens/refund/RefundFlowPhone';

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
      { id: 'sl2', variant_id: 'v_yogurt', title: 'Yogurt 500g', qty: 2, unit_price_minor: 2000 },
    ],
  })),
  fetchRecentSales: vi.fn(async () => []),
}));

describe('RefundFlowPhone', () => {
  it('walks step 1 → 2 → 3 and submits refund', async () => {
    render(<RefundFlowPhone onClose={() => {}} />);

    // Step 1: type receipt id + lookup
    const input = screen.getByPlaceholderText(/HN-LOC/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'HN-LOC-000240' } });
    fireEvent.click(screen.getByRole('button', { name: /Lookup/i }));

    // Step 2: select first line + pick reason
    await waitFor(() => expect(screen.getByText(/Basmati Rice/)).toBeInTheDocument());
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(screen.getByRole('button', { name: /Changed mind/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Next/i }));

    // Step 3: type PIN + process
    await waitFor(() => expect(screen.getByText(/Refund method/i)).toBeInTheDocument());
    for (const d of '1234') fireEvent.click(screen.getByRole('button', { name: d }));
    fireEvent.click(screen.getByRole('button', { name: /Process refund/i }));

    // Success state shows the refund amount
    await waitFor(() => expect(screen.getByText(/22,?000/)).toBeInTheDocument());
  });

  it('disables Next on step 2 until line + reason picked', async () => {
    render(<RefundFlowPhone onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/HN-LOC/i), { target: { value: 'HN-LOC-000240' } });
    fireEvent.click(screen.getByRole('button', { name: /Lookup/i }));
    await waitFor(() => screen.getByText(/Basmati Rice/));
    const nextBtn = screen.getByRole('button', { name: /^Next/i });
    expect(nextBtn).toBeDisabled();
  });
});
