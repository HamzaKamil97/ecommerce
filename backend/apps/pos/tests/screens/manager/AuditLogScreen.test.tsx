import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuditLogScreen } from '../../../src/ui/screens/manager/AuditLogScreen';
import * as auditApi from '../../../src/api/auditLog';

vi.mock('../../../src/api/auditLog', () => ({
  listAuditLog: vi.fn(),
  exportAuditLogUrl: vi.fn(),
}));

const l1: auditApi.AuditRow = {
  id: 'row-1',
  vendor_id: 'v',
  actor_id: 'cashier-1',
  actor_type: 'cashier',
  module: 'pos_terminal',
  action: 'create',
  entity_id: 'sale_1',
  before_json: null,
  after_json: { total_minor: 15750 },
  metadata: {},
  created_at: '2026-05-29T11:30:00Z',
};

const l2: auditApi.AuditRow = {
  id: 'row-2',
  vendor_id: 'v',
  actor_id: 'manager-1',
  actor_type: 'manager',
  module: 'catalog',
  action: 'update',
  entity_id: 'p_1',
  before_json: { price_minor: 1500 },
  after_json: { price_minor: 1650 },
  metadata: {},
  created_at: '2026-05-29T10:42:00Z',
};

beforeEach(() => {
  vi.mocked(auditApi.listAuditLog).mockResolvedValue({ rows: [l1, l2], total: 2 });
  vi.mocked(auditApi.exportAuditLogUrl).mockReturnValue(
    '/admin/audit-log/export.csv?vendor_id=v',
  );
});

describe('AuditLogScreen', () => {
  it('(a) renders summary tile "Actions today" and timeline entity ids', async () => {
    render(
      <MemoryRouter>
        <AuditLogScreen />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Summary tile label
      expect(screen.getByText('Actions today')).toBeInTheDocument();

      // Both entity IDs in the timeline
      expect(screen.getByText('sale_1')).toBeInTheDocument();
      expect(screen.getByText('p_1')).toBeInTheDocument();
    });
  });

  it('(b) clicking the p_1 entry expands a DiffView showing before/after values', async () => {
    render(
      <MemoryRouter>
        <AuditLogScreen />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('p_1')).toBeInTheDocument());

    // Click the entry head that contains p_1 — getByText('p_1') is the target span
    // which is inside the entry-head button; clicking it bubbles up.
    fireEvent.click(screen.getByText('p_1'));

    await waitFor(() => {
      // key appears in both pre and post lines — multiple elements expected
      expect(screen.getAllByText(/price_minor/).length).toBeGreaterThan(0);
      // before and after values are unique text nodes
      expect(screen.getByText('1500')).toBeInTheDocument();
      expect(screen.getByText('1650')).toBeInTheDocument();
    });
  });

  it('(c) Export CSV link has href containing /admin/audit-log/export.csv', async () => {
    render(
      <MemoryRouter>
        <AuditLogScreen />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /export csv/i });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toContain('/admin/audit-log/export.csv');
    });
  });
});
