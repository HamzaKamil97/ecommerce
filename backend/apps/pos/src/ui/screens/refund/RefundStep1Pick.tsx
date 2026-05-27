import { useState } from 'react';
import type { RefundState } from './useRefundState';
import { fetchSale } from '../../../api/sales';
import './RefundShared.css';
import './RefundPhone.css';

type Props = {
  refund: RefundState;
  onPicked: () => void;
  onClose: () => void;
};

export function RefundStep1Pick({ refund, onPicked, onClose }: Props) {
  const [receiptId, setReceiptId] = useState('HN-LOC-');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleLookup() {
    const id = receiptId.trim();
    if (!id || id === 'HN-LOC-') {
      setLocalError('Enter a receipt ID');
      return;
    }
    setLoading(true);
    setLocalError(null);
    try {
      const sale = await fetchSale(id);
      refund.setSale(sale);
      onPicked();
    } catch (e) {
      const err = e as { payload?: { error?: string; message?: string }; message?: string };
      setLocalError(
        err?.payload?.error ??
          err?.payload?.message ??
          err?.message ??
          'Could not load sale',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="refund-root refund-phone">
      <header className="refund-phone-header">
        <button type="button" className="refund-phone-back" onClick={onClose} aria-label="Close">
          ←
        </button>
        <div>
          <h1>Return / Refund</h1>
          <div className="refund-phone-step-meta">Step 1 of 3 · Find the sale</div>
        </div>
      </header>

      <div className="refund-progress" aria-label="progress">
        <div className="refund-dot-step current">1</div>
        <div className="refund-line-step" />
        <div className="refund-dot-step upcoming">2</div>
        <div className="refund-line-step" />
        <div className="refund-dot-step upcoming">3</div>
      </div>

      <div className="refund-phone-body">
        <button type="button" className="refund-opt" onClick={() => setLocalError('QR scan not yet wired')}>
          <div className="ic">📷</div>
          <div>
            <div className="title">Scan receipt QR</div>
            <div className="sub">Customer shows the QR on their receipt</div>
          </div>
          <div className="arrow">→</div>
        </button>

        <div className="refund-input-card">
          <div className="refund-input-label">— or — Enter receipt ID</div>
          <input
            className="refund-input"
            value={receiptId}
            placeholder="HN-LOC-000000"
            onChange={(e) => setReceiptId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLookup();
            }}
          />
          {localError && <div className="refund-error" style={{ marginTop: 10 }}>{localError}</div>}
          <button
            type="button"
            className="refund-input-action"
            onClick={handleLookup}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Lookup'}
          </button>
        </div>

        <div
          className="refund-card"
          style={{ padding: 0, overflow: 'hidden' }}
          aria-label="recent sales"
        >
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-3)' }}>
            <strong style={{ fontSize: 13 }}>Recent sales · today</strong>
          </div>
          <div style={{ padding: '14px', fontSize: 11, color: 'var(--ink-3)' }}>
            Recent list will populate when the sales endpoint ships.
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', padding: 8 }}>
          💡 Returns require manager PIN at step 3.
          <br />
          Every refund is logged to the audit trail.
        </div>
      </div>
    </div>
  );
}
