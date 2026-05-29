import { useCallback, useEffect, useMemo, useState } from 'react';
import { BulkToolbar } from '../../components/BulkToolbar';
import {
  listPendingRefunds,
  bulkApproveRefunds,
  bulkDeclineRefunds,
  grantCapabilityOverride,
} from '../../../api/approvals';
import type { RefundApproval } from '../../../api/approvals';
import { useSession } from '../../../state/session';
import { useResponsive } from '../../../hooks/useResponsive';
import { VENDOR_ID } from '../../../env';
import './ApprovalsTrayScreen.css';

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  { id: 'refunds', label: 'Refunds' },
  { id: 'stock_counts', label: 'Stock counts' },
  { id: 'returns', label: 'Returns' },
  { id: 'eod_recon', label: 'EOD recon' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(minor: number): string {
  return minor.toLocaleString();
}

// ─── Queue Card ──────────────────────────────────────────────────────────────

type QueueCardProps = {
  refund: RefundApproval;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onOpen: (refund: RefundApproval) => void;
};

function QueueCard({ refund, isSelected, isActive, onSelect, onOpen }: QueueCardProps) {
  return (
    <article
      className={`queue-card${isActive ? ' selected' : ''}`}
      onClick={() => onOpen(refund)}
    >
      <div className="qc-head">
        <div className="qc-checkbox-wrap" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="qc-checkbox"
            aria-label={`Select ${refund.sale_id}`}
            checked={isSelected}
            onChange={(e) => onSelect(refund.id, e.target.checked)}
          />
        </div>
        <div className="qc-body">
          <div className="qc-id">{refund.sale_id} · refund</div>
          <div className="qc-title">
            "{refund.reason}" — refund {formatAmount(refund.total_minor)} IQD
          </div>
          <div className="qc-meta">
            <span>👤 {refund.requested_by_name ?? refund.requested_by}</span>
          </div>
        </div>
        <div className="qc-amount">
          <div className="val">
            {formatAmount(refund.total_minor)}
            <small>IQD</small>
          </div>
          <div className="lbl">Refund total</div>
        </div>
      </div>
    </article>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

type DetailPanelProps = {
  refund: RefundApproval;
  onClose: () => void;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onGrantOverride: (cashierId: string) => void;
};

function DetailPanel({
  refund,
  onClose,
  onApprove,
  onDecline,
  onGrantOverride,
}: DetailPanelProps) {
  const name = refund.requested_by_name ?? refund.requested_by;

  return (
    <aside className="at-detail">
      <div className="detail-head">
        <div>
          <div className="label-cap">REFUND DETAIL · selected</div>
          <h2>{refund.sale_id}</h2>
          <div className="meta">
            Requested by {name} · {new Date(refund.created_at).toLocaleTimeString()}
          </div>
        </div>
        <button type="button" className="close-x" onClick={onClose} aria-label="Close detail">
          ✕
        </button>
      </div>

      <div className="info-rows">
        <div className="info-row">
          <span className="lbl">Reason</span>
          <span className="val">{refund.reason}</span>
        </div>
        <div className="info-row">
          <span className="lbl">Requested by</span>
          <span className="val">{name}</span>
        </div>
        <div className="info-row">
          <span className="lbl">Amount</span>
          <span className="val">{formatAmount(refund.total_minor)} IQD</span>
        </div>
      </div>

      {/* Override CTA */}
      <div className="override-cta">
        <div className="oc-icon">🔑</div>
        <div className="oc-body">
          <div className="oc-title">Why did this escalate?</div>
          <div className="oc-desc">
            {name}'s role-default for{' '}
            <code>pos.refund_or_void</code> requires manager approval. If you trust {name} to
            self-approve refunds, grant the override below.
          </div>
          <div className="oc-actions">
            <button
              type="button"
              className="btn-grant"
              onClick={() => onGrantOverride(refund.requested_by)}
            >
              ★ Grant {name} self-approve refunds
            </button>
          </div>
        </div>
      </div>

      <div className="detail-actions">
        <button
          type="button"
          className="btn decline"
          onClick={() => onDecline(refund.id)}
        >
          ✕ Decline
        </button>
        <button
          type="button"
          className="btn approve"
          onClick={() => onApprove(refund.id)}
        >
          ✓ Approve refund
        </button>
      </div>
    </aside>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function ApprovalsTrayScreen() {
  const vendorId = VENDOR_ID;
  const ownerId = useSession((s) => s.cashier_id) ?? 'owner';

  const { isWidthBelow } = useResponsive();
  const sheetMode = isWidthBelow(1100);

  const [activeTab, setActiveTab] = useState<TabId>('refunds');
  const [refunds, setRefunds] = useState<RefundApproval[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeDetail, setActiveDetail] = useState<RefundApproval | null>(null);

  // Load refunds on mount
  useEffect(() => {
    listPendingRefunds(vendorId).then(setRefunds);
  }, [vendorId]);

  // Selection handlers
  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  // Bulk approve
  const approveSelected = useCallback(async () => {
    const ids = [...selected];
    await bulkApproveRefunds(ids, ownerId);
    setRefunds((prev) => prev.filter((r) => !ids.includes(r.id)));
    setSelected(new Set());
    if (activeDetail && ids.includes(activeDetail.id)) setActiveDetail(null);
  }, [selected, ownerId, activeDetail]);

  // Bulk decline
  const declineSelected = useCallback(async () => {
    const ids = [...selected];
    await bulkDeclineRefunds(ids, ownerId);
    setRefunds((prev) => prev.filter((r) => !ids.includes(r.id)));
    setSelected(new Set());
    if (activeDetail && ids.includes(activeDetail.id)) setActiveDetail(null);
  }, [selected, ownerId, activeDetail]);

  // Single approve / decline
  const handleApprove = useCallback(
    async (id: string) => {
      await bulkApproveRefunds([id], ownerId);
      setRefunds((prev) => prev.filter((r) => r.id !== id));
      if (activeDetail?.id === id) setActiveDetail(null);
    },
    [ownerId, activeDetail],
  );

  const handleDecline = useCallback(
    async (id: string) => {
      await bulkDeclineRefunds([id], ownerId);
      setRefunds((prev) => prev.filter((r) => r.id !== id));
      if (activeDetail?.id === id) setActiveDetail(null);
    },
    [ownerId, activeDetail],
  );

  // Grant capability override
  const handleGrantOverride = useCallback(
    async (cashierId: string) => {
      await grantCapabilityOverride(cashierId, 'pos.refund_or_void');
    },
    [],
  );

  // Tab counts
  const tabCount = (tabId: TabId): number => {
    if (tabId === 'refunds') return refunds.length;
    return 0;
  };

  // Switching tabs abandons any cross-tab selection so the bulk toolbar can't
  // act on cards the user can no longer see.
  const switchTab = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    setSelected(new Set());
    setActiveDetail(null);
  }, []);

  // Bulk toolbar actions
  const bulkActions = useMemo(
    () => [
      {
        id: 'approve',
        label: `✓ Approve all ${selected.size}`,
        onClick: approveSelected,
      },
      {
        id: 'decline',
        label: `✕ Decline all ${selected.size}`,
        onClick: declineSelected,
        danger: true,
      },
    ],
    [selected.size, approveSelected, declineSelected],
  );

  return (
    <div className={`approvals-tray-screen${sheetMode ? ' sheet-mode' : ''}`}>
      {/* Header */}
      <header className="at-header">
        <h1>Approvals</h1>
        <div className="h-spacer" />
      </header>

      {/* Tabs */}
      <div role="tablist" className="at-tabs">
        {TABS.map((tab) => {
          const count = tabCount(tab.id);
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              className="at-tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => switchTab(tab.id)}
            >
              <span>{tab.label}</span>
              <span className={`pill${count === 0 ? ' zero' : ''}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Bulk toolbar (paper variant) */}
      {selected.size >= 2 && (
        <BulkToolbar
          variant="paper"
          count={selected.size}
          actions={bulkActions}
          onClose={clearSelection}
        />
      )}

      {/* Shell */}
      <div
        className="at-shell"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {/* Queue */}
        <div className="at-queue">
          {activeTab === 'refunds' && (
            <div className="at-queue-list">
              {refunds.length === 0 && (
                <div className="at-empty">No pending refund approvals</div>
              )}
              {refunds.map((r) => (
                <QueueCard
                  key={r.id}
                  refund={r}
                  isSelected={selected.has(r.id)}
                  isActive={activeDetail?.id === r.id}
                  onSelect={handleSelect}
                  onOpen={setActiveDetail}
                />
              ))}
            </div>
          )}
          {activeTab !== 'refunds' && (
            <div className="at-empty">No pending approvals in this category</div>
          )}
        </div>

        {/* Detail panel */}
        {activeDetail ? (
          <DetailPanel
            refund={activeDetail}
            onClose={() => setActiveDetail(null)}
            onApprove={handleApprove}
            onDecline={handleDecline}
            onGrantOverride={handleGrantOverride}
          />
        ) : (
          <div className="at-detail at-detail-empty">
            Select an item to review
          </div>
        )}
      </div>
    </div>
  );
}
