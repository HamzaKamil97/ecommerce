import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApprovalsTrayScreen } from '../../../src/ui/screens/manager/ApprovalsTrayScreen';
import * as approvals from '../../../src/api/approvals';

vi.mock('../../../src/api/approvals', () => ({
  listPendingRefunds: vi.fn(),
  bulkApproveRefunds: vi.fn(),
  bulkDeclineRefunds: vi.fn(),
  grantCapabilityOverride: vi.fn(),
}));

const MOCK_REFUNDS = [
  {
    id: 'a1',
    vendor_id: 'v1',
    sale_id: 'HN-1',
    original_sale_id: 'HN-1',
    total_minor: 12750,
    reason: 'Item is expired',
    requested_by: 'cashier-hala',
    requested_by_name: 'Hala',
    status: 'pending' as const,
    created_at: '2026-05-27T11:49:00Z',
  },
  {
    id: 'a2',
    vendor_id: 'v1',
    sale_id: 'HN-2',
    original_sale_id: 'HN-2',
    total_minor: 5500,
    reason: 'Customer changed mind',
    requested_by: 'cashier-ahmed',
    requested_by_name: 'Ahmed',
    status: 'pending' as const,
    created_at: '2026-05-27T11:55:00Z',
  },
];

beforeEach(() => {
  vi.mocked(approvals.listPendingRefunds).mockResolvedValue(MOCK_REFUNDS);
  vi.mocked(approvals.bulkApproveRefunds).mockResolvedValue({ processed: 2, failed: [] });
  vi.mocked(approvals.bulkDeclineRefunds).mockResolvedValue({ processed: 2, failed: [] });
  vi.mocked(approvals.grantCapabilityOverride).mockResolvedValue(undefined);
});

describe('ApprovalsTrayScreen', () => {
  it('renders 4 tabs and shows Refunds count of 2', async () => {
    render(<MemoryRouter><ApprovalsTrayScreen /></MemoryRouter>);

    await waitFor(() => {
      // 4 tabs present
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(4);

      // Tab labels
      expect(screen.getByRole('tab', { name: /refunds/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /stock counts/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /returns/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /eod recon/i })).toBeInTheDocument();

      // Refunds count badge shows 2
      const refundsTab = screen.getByRole('tab', { name: /refunds/i });
      expect(refundsTab.textContent).toMatch(/2/);
    });
  });

  it('selecting 2 cards opens the paper BulkToolbar showing "approve all 2"', async () => {
    render(<MemoryRouter><ApprovalsTrayScreen /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByLabelText(/select HN-1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/select HN-1/i));
    fireEvent.click(screen.getByLabelText(/select HN-2/i));

    await waitFor(() => {
      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      expect(toolbar).toBeInTheDocument();
      expect(toolbar.textContent).toMatch(/approve all 2/i);
    });
  });

  it('clicking "Approve all 2" calls bulkApproveRefunds with both IDs', async () => {
    render(<MemoryRouter><ApprovalsTrayScreen /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByLabelText(/select HN-1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/select HN-1/i));
    fireEvent.click(screen.getByLabelText(/select HN-2/i));

    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /✓ approve all 2/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(vi.mocked(approvals.bulkApproveRefunds)).toHaveBeenCalledWith(
        ['a1', 'a2'],
        expect.any(String),
      );
    });
  });
});
