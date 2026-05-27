import type { RefundState } from './useRefundState';
import type { RefundReason } from '../../../api/refunds';
import './RefundShared.css';
import './RefundPhone.css';

type Props = {
  refund: RefundState;
  onBack: () => void;
  onNext: () => void;
};

const REASONS: Array<{ key: RefundReason; label: string; danger?: boolean }> = [
  { key: 'damaged', label: 'Damaged', danger: true },
  { key: 'expired', label: 'Expired', danger: true },
  { key: 'changed_mind', label: 'Changed mind' },
  { key: 'wrong_item', label: 'Wrong item' },
  { key: 'quality_issue', label: 'Quality issue', danger: true },
];

function formatMinor(n: number): string {
  return n.toLocaleString('en-US');
}

export function RefundStep2Items({ refund, onBack, onNext }: Props) {
  const sale = refund.sale;
  if (!sale) {
    return (
      <div className="refund-root refund-phone">
        <div className="refund-phone-body">
          <div className="refund-error">No sale loaded</div>
          <button type="button" className="refund-btn refund-btn-soft" onClick={onBack}>Back</button>
        </div>
      </div>
    );
  }

  const nextDisabled = refund.selected.length === 0 || !refund.allReasonsPicked;

  return (
    <div className="refund-root refund-phone">
      <header className="refund-phone-header">
        <button type="button" className="refund-phone-back" onClick={onBack} aria-label="Back">
          ←
        </button>
        <div>
          <h1>Pick items + reasons</h1>
          <div className="refund-phone-step-meta">Step 2 of 3 · Sale {sale.id}</div>
        </div>
      </header>

      <div className="refund-progress">
        <div className="refund-dot-step done">✓</div>
        <div className="refund-line-step done" />
        <div className="refund-dot-step current">2</div>
        <div className="refund-line-step" />
        <div className="refund-dot-step upcoming">3</div>
      </div>

      <div className="refund-phone-body">
        <div className="refund-receipt">
          <div className="refund-receipt-head">
            <div className="shop-name">Hanoot · Karrada Shop 01</div>
            <div className="shop-meta">cashier · sale receipt</div>
            <div className="sale-id">{sale.id}</div>
          </div>

          {sale.lines.map((line) => {
            const sel = refund.selected.find((s) => s.line_id === line.id);
            const checked = !!sel;
            const total = line.qty * line.unit_price_minor;
            return (
              <div key={line.id}>
                <div
                  className={`refund-line${checked ? ' checked' : ''}`}
                  onClick={() => refund.toggleLine(line.id)}
                  role="presentation"
                >
                  <input
                    type="checkbox"
                    className={`refund-cb${checked ? ' on' : ''}`}
                    checked={checked}
                    onChange={() => refund.toggleLine(line.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${line.title}`}
                    style={{ appearance: 'none', cursor: 'pointer' }}
                  />
                  <div className="refund-thumb">📦</div>
                  <div>
                    <div className="refund-line-name">{line.title}</div>
                    <small>× {line.qty}</small>
                  </div>
                  <div className="refund-line-total refund-mono">{formatMinor(total)}</div>
                </div>
                {checked && (
                  <div className="refund-reason-row" role="group" aria-label={`reason for ${line.title}`}>
                    <span className="refund-reason-label">Reason</span>
                    {REASONS.map((r) => {
                      const selected = sel?.reason === r.key;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          className={`refund-reason-chip${selected ? ' selected' : ''}${r.danger ? ' danger' : ''}`}
                          onClick={() => refund.setReason(line.id, r.key)}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-3)', padding: '12px 6px', textAlign: 'center' }}>
          {refund.selected.length} of {sale.lines.length} items selected · Pick reason for each.
          <br />
          <span style={{ color: 'var(--burgundy)', fontWeight: 700 }}>
            ⚠ Damaged / Expired items will be removed from on-hand stock.
          </span>
        </div>
      </div>

      <div className="refund-foot refund-phone-foot">
        <div className="refund-foot-summary">
          <span className="lab">Refund total</span>
          <span className="amt">{formatMinor(refund.refundTotalMinor)} IQD</span>
        </div>
        <button
          type="button"
          className="refund-btn refund-btn-primary"
          onClick={onNext}
          disabled={nextDisabled}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
