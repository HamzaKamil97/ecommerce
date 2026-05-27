import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StockCountScreen } from '../../src/ui/screens/StockCountScreen';

vi.mock('../../src/api/inventoryCount', () => ({
  openCount: vi.fn(async () => ({
    id: 'ics_1',
    status: 'in_progress',
    vendor_id: 'v_test',
    actor_id: 'a',
    scope: 'all',
    expected_total: null,
    counted_total: null,
    delta_total: null,
    note: null,
    applied_at: null,
  })),
  getCount: vi.fn(async () => ({
    session: { id: 'ics_1', status: 'in_progress', vendor_id: 'v_test' },
    lines: [],
  })),
  addCountLine: vi.fn(async (id: string, p: any) => ({
    id: 'icl_' + Math.random(),
    session_id: id,
    ...p,
    delta: p.actual_qty - p.system_qty,
  })),
  applyCount: vi.fn(async () => ({
    id: 'ics_1',
    status: 'applied',
    delta_total: -2,
  })),
  cancelCount: vi.fn(async () => ({ id: 'ics_1', status: 'cancelled' })),
}));

vi.mock('../../src/db/catalog-sync', () => ({
  findByBarcode: vi.fn(async (code: string) => {
    if (code === '6281007101205')
      return { variant_id: 'v_milk', name: 'Milk 1L · Almarai', price_minor: 2750 };
    return null;
  }),
}));

describe('StockCountScreen', () => {
  it('renders the scope picker initially', () => {
    render(<StockCountScreen onClose={() => {}} />);
    expect(screen.getByText(/Whole shop/i)).toBeInTheDocument();
    expect(screen.getByText(/Department/i)).toBeInTheDocument();
    expect(screen.getByText(/Specific products/i)).toBeInTheDocument();
  });

  it('Start count → calls openCount + transitions to counting UI', async () => {
    render(<StockCountScreen onClose={() => {}} />);
    fireEvent.click(
      screen.getByRole('button', { name: /Start count|Begin|Open/i }),
    );
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/Find product|scan|barcode/i),
      ).toBeInTheDocument(),
    );
  });

  it('typing a barcode adds a count line', async () => {
    render(<StockCountScreen onClose={() => {}} />);
    fireEvent.click(
      screen.getByRole('button', { name: /Start count|Begin|Open/i }),
    );
    await waitFor(() =>
      screen.getByPlaceholderText(/Find product|scan|barcode/i),
    );
    const input = screen.getByPlaceholderText(/Find product|scan|barcode/i);
    fireEvent.change(input, { target: { value: '6281007101205' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByText(/Milk 1L|Almarai/i)).toBeInTheDocument(),
    );
  });

  it('clicking Apply count calls applyCount', async () => {
    render(<StockCountScreen onClose={() => {}} />);
    fireEvent.click(
      screen.getByRole('button', { name: /Start count|Begin|Open/i }),
    );
    await waitFor(() =>
      screen.getByPlaceholderText(/Find product|scan|barcode/i),
    );
    const apply = screen.getByRole('button', { name: /Apply count/i });
    fireEvent.click(apply);
    const { applyCount } = await import('../../src/api/inventoryCount');
    await waitFor(() => expect(applyCount).toHaveBeenCalled());
  });
});
