import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PinResetScreen } from '../../../src/ui/screens/manager/PinResetScreen';
import * as staff from '../../../src/api/staff';
import type { StaffRow } from '../../../src/api/staff';

vi.mock('../../../src/api/staff', () => ({
  listStaff: vi.fn(),
  resetPin: vi.fn(),
}));

const MOCK_STAFF: StaffRow[] = [
  {
    id: 'c1',
    vendor_id: 'v1',
    name: 'Hala Aboud',
    role: 'cashier',
    permission_overrides: {} as Record<string, true | false>,
    last_active_at: null,
  },
  {
    id: 'c2',
    vendor_id: 'v1',
    name: 'Ahmed Saeed',
    role: 'cashier',
    permission_overrides: { 'pos.refund_or_void': true as true },
    last_active_at: null,
  },
  {
    id: 'c3',
    vendor_id: 'v1',
    name: 'Rana Hassan',
    role: 'cashier',
    permission_overrides: { 'pos.refund_or_void': false as false },
    last_active_at: null,
  },
];

beforeEach(() => {
  vi.mocked(staff.listStaff).mockResolvedValue(MOCK_STAFF);
  vi.mocked(staff.resetPin).mockResolvedValue({ ok: true });
});

describe('PinResetScreen', () => {
  it('(a) shows capability pills: override-on for Ahmed, override-off for Rana, PIN required for Hala', async () => {
    render(<MemoryRouter><PinResetScreen /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Hala Aboud')).toBeInTheDocument();
    });

    // Scope to the staff list to avoid collision with legend pills
    const list = screen.getByRole('list', { name: /staff/i });

    // Ahmed's row shows Override ON
    within(list).getByText(/★ Override ON/i);

    // Rana's row shows Override OFF
    within(list).getByText(/⛔ Override OFF/i);

    // Hala's refund default is PIN required — at least one such pill in the list
    const pinPills = within(list).getAllByText(/PIN required/i);
    expect(pinPills.length).toBeGreaterThanOrEqual(1);
  });

  it('(b) clicking Reset opens modal; Save disabled; entering 4-7-2-1 enables it; Save calls resetPin', async () => {
    render(<MemoryRouter><PinResetScreen /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Hala Aboud')).toBeInTheDocument();
    });

    const list = screen.getByRole('list', { name: /staff/i });
    const resetButtons = within(list).getAllByRole('button', { name: /reset/i });

    // Click first row's Reset button (Hala)
    fireEvent.click(resetButtons[0]!);

    // Modal opens
    const dialog = screen.getByRole('dialog', { name: /reset pin/i });
    expect(dialog).toBeInTheDocument();

    // Save button is disabled initially
    const saveBtn = screen.getByRole('button', { name: /save · 4-digit pin/i });
    expect(saveBtn).toBeDisabled();

    // Enter digits 4, 7, 2, 1
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));

    // Save button is now enabled
    expect(saveBtn).not.toBeDisabled();

    // Click Save
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(staff.resetPin).toHaveBeenCalledWith('c1', '4721');
    });
  });

  it('(c) entering 1-2-3-4 shows sequential PIN error', async () => {
    render(<MemoryRouter><PinResetScreen /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Hala Aboud')).toBeInTheDocument();
    });

    const list = screen.getByRole('list', { name: /staff/i });
    const resetButtons = within(list).getAllByRole('button', { name: /reset/i });
    fireEvent.click(resetButtons[0]!);

    // Enter sequential digits
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    expect(screen.getByText(/sequential pin/i)).toBeInTheDocument();
  });
});
