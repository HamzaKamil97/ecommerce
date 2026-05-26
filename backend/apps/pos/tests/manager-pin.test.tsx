import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManagerPinGate } from '../src/ui/screens/manager/ManagerPinGate';
import { useManagerSession } from '../src/state/manager-session';

vi.mock('../src/api/pos', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/api/pos')>();
  return {
    ...mod,
    verifyCashierPin: vi.fn(),
    fetchCashiers: vi.fn(),
  };
});

import * as posApi from '../src/api/pos';

describe('ManagerPinGate', () => {
  beforeEach(() => {
    useManagerSession.setState({ manager_id: null, manager_name: null });
    vi.clearAllMocks();
  });

  it('rejects when role !== manager', async () => {
    vi.mocked(posApi.verifyCashierPin).mockResolvedValue({
      id: 'c1', vendor_id: 'v', name: 'C', role: 'cashier', active: true,
    });
    vi.mocked(posApi.fetchCashiers).mockResolvedValue([
      { id: 'c1', vendor_id: 'v', name: 'C', role: 'cashier', active: true, pin_hash_prefix: '00000000' },
    ]);
    render(<ManagerPinGate>protected</ManagerPinGate>);
    await waitFor(() => screen.getByText('C'));
    fireEvent.click(screen.getByText('C'));
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Unlock'));
    await waitFor(() => {
      expect(screen.getByText(/manager role required/i)).toBeTruthy();
    });
    expect(useManagerSession.getState().manager_id).toBeNull();
  });

  it('admits when role === manager and renders children', async () => {
    vi.mocked(posApi.verifyCashierPin).mockResolvedValue({
      id: 'm1', vendor_id: 'v', name: 'Boss', role: 'manager', active: true,
    });
    vi.mocked(posApi.fetchCashiers).mockResolvedValue([
      { id: 'm1', vendor_id: 'v', name: 'Boss', role: 'manager', active: true, pin_hash_prefix: '00000000' },
    ]);
    render(<ManagerPinGate>secret content</ManagerPinGate>);
    await waitFor(() => screen.getByText('Boss'));
    fireEvent.click(screen.getByText('Boss'));
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '4321' } });
    fireEvent.click(screen.getByText('Unlock'));
    await waitFor(() => screen.getByText('secret content'));
    expect(useManagerSession.getState().manager_id).toBe('m1');
  });
});
