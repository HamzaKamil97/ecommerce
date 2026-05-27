import type { RefundState } from './useRefundState';
import './RefundShared.css';
import './RefundPhone.css';

type Props = {
  refund: RefundState;
  onBack: () => void;
  onClose: () => void;
};

function formatMinor(n: number): string {
  return n.toLocaleString('en-US');
}

const REASON_LABEL: Record<string, string> = {
  damaged: 'Damaged',
  expired: 'Expired',
  changed_mind: 'Changed mind',
  wrong_item: 'Wrong item',
  quality_issue: 'Quality issue',
  other: 'Other',
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function RefundStep3Confirm({ refund, onBack, onClose }: Props) {
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

  if (refund.success) {
    return (
      <div className="refund-root refund-phone">
        <div className="refund-success">
          <div className="refund-success-icon">✓</div>
          <div className="refund-success-amount">{formatMinor(refund.success.refund_total_minor)} IQD</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Refund processed</div>
          <div className="refund-success-meta">
            {refund.success.stock_returned_units} units back to stock ·{' '}
            {refund.success.stock_damaged_units} damaged
          </div>
          <button
            type="button"
            className="refund-btn refund-btn-primary"
            onClick={() => {
              refund.reset();
              onClose();
            }}
          >
            New sale
          </button>
        </div>
      </div>
    );
  }

  function handleProcess() {
    void refund.submit({ manager_id: 'm_default' });
  }

  const totalUnits = refund.selected.reduce((n, s) => n + s.qty, 0);

  return (
    <div className="refund-root refund-phone">
      <header className="refund-phone-header">
        <button type="button" className="refund-phone-back" onClick={onBack} aria-label="Back">
          ←
        </button>
        <div>
          <h1>Confirm refund</h1>
          <div className="refund-phone-step-meta">Step 3 of 3 · Manager approval</div>
        </div>
      </header>

      <div className="refund-progress">
        <div className="refund-dot-step done">✓</div>
        <div className="refund-line-step done" />
        <div className="refund-dot-step done">✓</div>
        <div className="refund-line-step" />
        <div className="refund-dot-step current">3</div>
      </div>

      <div className="refund-phone-body">
        <div className="refund-card">
          <h3>Refund method</h3>
          <div className="refund-radio-row">
            <button
              type="button"
              className={`refund-radio${refund.method === 'cash' ? ' selected' : ''}`}
              onClick={() => refund.setMethod('cash')}
            >
              <div className="ic">💵</div>
              <div className="name">Cash</div>
              <div className="sub">Hand bills to customer</div>
            </button>
            <button
              type="button"
              className={`refund-radio${refund.method === 'store_credit' ? ' selected' : ''}`}
              onClick={() => refund.setMethod('store_credit')}
            >
              <div className="ic">🎟</div>
              <div className="name">Store credit</div>
              <div className="sub">Adds {formatMinor(refund.refundTotalMinor)} to wallet</div>
            </button>
          </div>
        </div>

        <div className="refund-card">
          <h3>Manager PIN</h3>
          <div className="refund-pin-block">
            <div className="refund-pin-dots">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`refund-pin-dot${refund.pin.length > i ? ' filled' : ''}`}>
                  •
                </div>
              ))}
            </div>
            <div className="refund-pin-meta">Enter manager 4-digit PIN</div>
          </div>

          <div className="refund-keypad" role="group" aria-label="PIN keypad">
            {KEYS.map((k, i) =>
              k === '' ? (
                <button key={i} type="button" className="refund-k empty" aria-hidden="true" tabIndex={-1} />
              ) : k === '⌫' ? (
                <button
                  key={i}
                  type="button"
                  className="refund-k bksp"
                  onClick={() => refund.backspacePin()}
                  aria-label="Backspace"
                >
                  ⌫
                </button>
              ) : (
                <button
                  key={i}
                  type="button"
                  className="refund-k"
                  onClick={() => refund.appendPin(k)}
                  aria-label={k}
                  name={k}
                >
                  {k}
                </button>
              ),
            )}
          </div>

          {refund.pin.length === 4 && (
            <div className="refund-pin-approved">
              <div className="refund-approved-check">✓</div>
              <div>
                <div className="refund-approved-title">Manager approval ready</div>
                <div className="refund-approved-meta">Will verify on submit</div>
              </div>
            </div>
          )}
        </div>

        <div className="refund-card">
          <h3>Summary</h3>
          <div className="refund-sum-row">
            <span className="key">Items returned</span>
            <span className="val">{refund.selected.length} lines · {totalUnits} units</span>
          </div>
          {refund.selected.map((s) => {
            const line = sale.lines.find((l) => l.id === s.line_id);
            if (!line) return null;
            return (
              <div className="refund-sum-row" key={s.line_id}>
                <span className="key">{line.title} ×{s.qty}</span>
                <span className="val">
                  {formatMinor(s.qty * line.unit_price_minor)} IQD ·{' '}
                  {REASON_LABEL[s.reason ?? 'other'] ?? s.reason}
                </span>
              </div>
            );
          })}
          <div className="refund-sum-row refund-sum-total">
            <span className="key">Refund total</span>
            <span className="val">{formatMinor(refund.refundTotalMinor)} IQD</span>
          </div>

          <div className="refund-sum-audit">
            🔒 audit log → aul_<span style={{ color: 'var(--gold-3)' }}>__</span> will be created
            <br />
            actor: cashier · approver: manager · action: refund
            <br />
            before/after JSON captured for compliance
          </div>
        </div>

        {refund.error && <div className="refund-error">{refund.error}</div>}
      </div>

      <div className="refund-foot refund-phone-foot">
        <button type="button" className="refund-btn refund-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="refund-btn refund-btn-danger"
          style={{ flex: 1 }}
          onClick={handleProcess}
          disabled={!refund.readyToSubmit}
        >
          Process refund · {formatMinor(refund.refundTotalMinor)} IQD
        </button>
      </div>
    </div>
  );
}
