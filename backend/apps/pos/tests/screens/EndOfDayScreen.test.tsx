import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EndOfDayScreen } from '../../src/ui/screens/EndOfDayScreen';

vi.mock('../../src/api/cashSession', () => ({
  getCurrentSession: vi.fn(async () => ({
    id: 'cs_1',
    vendor_id: 'v_test',
    terminal_id: 'term_dev_1',
    cashier_id: 'dev_cashier',
    status: 'open',
    opening_float_minor: 50000,
    cash_sales_minor: 142500,
    refunds_minor: 6200,
    expected_total_minor: 186300,
    counted_total_minor: null,
    diff_minor: null,
    denomination_count: null,
    opened_at: new Date().toISOString(),
    closed_at: null,
    note: null,
    currency_code: 'iqd',
  })),
  closeSession: vi.fn(async () => ({
    id: 'cs_1',
    status: 'closed',
    diff_minor: 450,
  })),
  openSession: vi.fn(async () => ({ id: 'cs_2', status: 'open' })),
}));

describe('EndOfDayScreen', () => {
  it('renders the 4 vitals after loading session', async () => {
    render(<EndOfDayScreen onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/186,?300/)).toBeInTheDocument());
    expect(screen.getByText(/142,?500/)).toBeInTheDocument();
    expect(screen.getByText(/6,?200/)).toBeInTheDocument();
    expect(screen.getByText(/50,?000/)).toBeInTheDocument();
    expect(screen.getByText(/186,?300/)).toBeInTheDocument();
  });

  it('typing denominations updates the live counted total + diff', async () => {
    render(<EndOfDayScreen onClose={() => {}} />);
    await waitFor(() => screen.getByText(/186,?300/));
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0]!, { target: { value: '3' } });
    fireEvent.change(inputs[2]!, { target: { value: '3' } });
    fireEvent.change(inputs[3]!, { target: { value: '1' } });
    fireEvent.change(inputs[4]!, { target: { value: '1' } });
    fireEvent.change(inputs[5]!, { target: { value: '3' } });
    await waitFor(() =>
      expect(screen.getByText(/\+\s*450|over/i)).toBeInTheDocument(),
    );
  });

  it('Close till is disabled when diff != 0 and note is empty', async () => {
    render(<EndOfDayScreen onClose={() => {}} />);
    await waitFor(() => screen.getByText(/186,?300/));
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0]!, { target: { value: '3' } });
    fireEvent.change(inputs[2]!, { target: { value: '3' } });
    fireEvent.change(inputs[3]!, { target: { value: '1' } });
    fireEvent.change(inputs[4]!, { target: { value: '1' } });
    fireEvent.change(inputs[5]!, { target: { value: '3' } });
    const closeBtn = screen.getByRole('button', { name: /Close till/i });
    expect(closeBtn).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Counted twice.' },
    });
    expect(closeBtn).toBeEnabled();
  });

  it('Close till is disabled before counting (counted=0, diff != 0, note empty)', async () => {
    render(<EndOfDayScreen onClose={() => {}} />);
    await waitFor(() => screen.getByText(/186,?300/));
    expect(screen.getByRole('button', { name: /Close till/i })).toBeDisabled();
  });

  it('Close till submits and shows success', async () => {
    render(<EndOfDayScreen onClose={() => {}} />);
    await waitFor(() => screen.getByText(/186,?300/));
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0]!, { target: { value: '3' } });
    fireEvent.change(inputs[2]!, { target: { value: '3' } });
    fireEvent.change(inputs[3]!, { target: { value: '1' } });
    fireEvent.change(inputs[4]!, { target: { value: '1' } });
    fireEvent.change(inputs[5]!, { target: { value: '3' } });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'over by 450' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Close till/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/closed|success|Till closed/i),
      ).toBeInTheDocument(),
    );
  });
});
