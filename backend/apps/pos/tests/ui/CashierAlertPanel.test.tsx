import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CashierAlertPanel } from '../../src/ui/components/CashierAlertPanel';

const ALERTS = [
  { id: '1', severity: 'critical' as const, title: 'Expired item', message: 'Yogurt 500g exp 2026-05-19', type: 'stock_expired', created_at: new Date().toISOString(), read_at: null },
  { id: '2', severity: 'warning' as const, title: 'Low stock: 4 SKUs', message: 'Eggs (3), Coke (5)', type: 'stock_low', created_at: new Date().toISOString(), read_at: null },
  { id: '3', severity: 'info' as const, title: 'Order delivered', message: 'HN-0528', type: 'order_delivered', created_at: new Date().toISOString(), read_at: new Date().toISOString() },
];

describe('CashierAlertPanel', () => {
  it('returns null when not open', () => {
    const { container } = render(<CashierAlertPanel open={false} alerts={ALERTS} onMarkAllRead={() => {}} onClose={() => {}} />);
    expect(container.querySelector('.alert-panel')).toBeNull();
  });

  it('renders all alerts with their titles', () => {
    render(<CashierAlertPanel open={true} alerts={ALERTS} onMarkAllRead={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Expired item/)).toBeInTheDocument();
    expect(screen.getByText(/Low stock/)).toBeInTheDocument();
    expect(screen.getByText(/Order delivered/)).toBeInTheDocument();
  });

  it('shows total count in header', () => {
    render(<CashierAlertPanel open={true} alerts={ALERTS} onMarkAllRead={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/3 active/i)).toBeInTheDocument();
  });

  it('mark all read calls callback', () => {
    const onMark = vi.fn();
    render(<CashierAlertPanel open={true} alerts={ALERTS} onMarkAllRead={onMark} onClose={() => {}} />);
    fireEvent.click(screen.getByText(/Mark all read/i));
    expect(onMark).toHaveBeenCalled();
  });

  it('shows empty state when no alerts', () => {
    render(<CashierAlertPanel open={true} alerts={[]} onMarkAllRead={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/No alerts/i)).toBeInTheDocument();
  });
});
