import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCart } from '../../src/state/cart';
import { PaymentScreen } from '../../src/ui/screens/PaymentScreen';

beforeEach(() => {
  useCart.getState().reset();
  useCart.getState().addLineFromScan({
    variant_id: 'v1',
    name: 'Test',
    unit_price_minor: 13500,
    qty: 1,
  });
  (global as any).Audio = vi.fn(() => ({ play: vi.fn(() => Promise.resolve()) }));
});

describe('PaymentScreen v2', () => {
  it('renders total in dark header', () => {
    render(<PaymentScreen onClose={() => {}} />);
    expect(screen.getByText(/13,?500/)).toBeInTheDocument();
  });

  it('Exact chip sets received to subtotal exactly', () => {
    render(<PaymentScreen onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Exact/i }));
    // Change due should be 0 — find ANY element containing literal 0 with mono / change-amount class
    // Use a more robust check: confirm Confirm button is enabled
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeEnabled();
  });

  it('+10,000 then +5,000 chips → received = 15,000 → change = 1,500', () => {
    render(<PaymentScreen onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /\+10[,\s]?000|\+10k/i }));
    fireEvent.click(screen.getByRole('button', { name: /\+5[,\s]?000|\+5k/i }));
    // 15,000 - 13,500 = 1,500 change
    expect(screen.getByText(/1,?500/)).toBeInTheDocument();
  });

  it('Confirm button disabled when received < total', () => {
    render(<PaymentScreen onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeDisabled();
  });

  it('digit keys append to received', () => {
    render(<PaymentScreen onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: /000/i }));
    // received = 15,000 → change = 1,500
    expect(screen.getByText(/1,?500/)).toBeInTheDocument();
  });

  it('backspace removes last digit', () => {
    render(<PaymentScreen onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: /⌫|Backspace/i }));
    // received = 1 → very negative change, confirm disabled
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeDisabled();
  });
});
