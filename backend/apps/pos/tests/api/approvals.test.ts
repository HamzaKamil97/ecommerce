import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import {
  listPendingRefunds,
  bulkApproveRefunds,
  bulkDeclineRefunds,
  createRefundRequest,
} from '../../src/api/approvals';
import type { CreateRefundRequestInput } from '../../src/api/approvals';

vi.mock('../../src/api/client', () => ({
  api: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

const mockApproval = {
  id: 'ap1',
  vendor_id: 'v_test',
  sale_id: 'HN-1',
  total_minor: 12750,
  reason: 'Item is expired',
  requested_by: 'cashier-hala',
  requested_by_name: 'Hala',
  status: 'pending' as const,
  created_at: '2026-05-30T10:00:00Z',
};

beforeEach(() => vi.clearAllMocks());

describe('approvals api client', () => {
  // ─── listPendingRefunds ───────────────────────────────────────────────────

  it('listPendingRefunds calls apiGet with the correct path including vendor_id + status=pending', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ approvals: [mockApproval] });
    await listPendingRefunds('v_test');
    expect(client.apiGet).toHaveBeenCalledWith(
      '/admin/approvals/refunds?vendor_id=v_test&status=pending',
    );
  });

  it('listPendingRefunds unwraps {approvals} and returns the array', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ approvals: [mockApproval] });
    const out = await listPendingRefunds('v_test');
    expect(out).toEqual([mockApproval]);
  });

  it('listPendingRefunds returns [] when the request rejects (defensive fallback)', async () => {
    vi.mocked(client.apiGet).mockRejectedValue(new Error('Network error'));
    const out = await listPendingRefunds('v_test');
    expect(out).toEqual([]);
  });

  // ─── bulkApproveRefunds ───────────────────────────────────────────────────

  it('bulkApproveRefunds POSTs to the bulk route with correct body (decision=approve)', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ processed: 2, failed: [] });
    await bulkApproveRefunds(['a1', 'a2'], 'owner');
    expect(client.apiPost).toHaveBeenCalledWith('/admin/approvals/refunds/bulk', {
      refunds: ['a1', 'a2'],
      decision: 'approve',
      approver_id: 'owner',
    });
  });

  // ─── bulkDeclineRefunds ───────────────────────────────────────────────────

  it('bulkDeclineRefunds POSTs to the bulk route with correct body (decision=decline)', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ processed: 1, failed: [] });
    await bulkDeclineRefunds(['a1'], 'owner');
    expect(client.apiPost).toHaveBeenCalledWith('/admin/approvals/refunds/bulk', {
      refunds: ['a1'],
      decision: 'decline',
      approver_id: 'owner',
    });
  });

  // ─── createRefundRequest ──────────────────────────────────────────────────

  it('createRefundRequest POSTs to /admin/approvals/refunds with the input', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ approval: mockApproval });
    const input: CreateRefundRequestInput = {
      vendor_id: 'v_test',
      original_sale_id: 'HN-1',
      total_minor: 12750,
      reason: 'Item is expired',
      requested_by: 'cashier-hala',
      requested_by_name: 'Hala',
      payload: { items: [] },
    };
    await createRefundRequest(input);
    expect(client.apiPost).toHaveBeenCalledWith('/admin/approvals/refunds', input);
  });

  it('createRefundRequest unwraps {approval} and returns the created approval', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ approval: mockApproval });
    const input: CreateRefundRequestInput = {
      vendor_id: 'v_test',
      original_sale_id: 'HN-1',
      total_minor: 12750,
      reason: 'Item is expired',
      requested_by: 'cashier-hala',
      payload: { items: [] },
    };
    const out = await createRefundRequest(input);
    expect(out).toEqual(mockApproval);
    expect(out.id).toBe('ap1');
  });
});
