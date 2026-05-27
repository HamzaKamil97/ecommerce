import { useEffect, useState } from 'react';
import { useRefundState } from './useRefundState';
import { fetchSale } from '../../../api/sales';
import type { RefundReason } from '../../../api/refunds';
import { useSession } from '../../../state/session';
import './RefundShared.css';
import './RefundScreen.css';

function envVal(key: string, fallback: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any)?.env ?? {};
  return env[key] || fallback;
}

function formatMinor(n: number): string {
  return n.toLocaleString('en-US');
}

const REASONS: Array<{ key: RefundReason; label: string; danger?: boolean }> = [
  { key: 'damaged', label: 'Damaged', danger: true },
  { key: 'expired', label: 'Expired', danger: true },
  { key: 'changed_mind', label: 'Changed mind' },
  { key: 'wrong_item', label: 'Wrong item' },
  { key: 'quality_issue', label: 'Quality issue', danger: true },
];

const REASON_LABEL: Record<string, string> = {
  damaged: 'Damaged',
  expired: 'Expired',
  changed_mind: 'Changed mind',
  wrong_item: 'Wrong item',
  quality_issue: 'Quality issue',
  other: 'Other',
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

type Props = { onClose: () => void };

export function RefundScreen({ onClose }: Props) {
  const cashier_id = useSession((s) => s.cashier_id) ?? 'dev_cashier';
  const refund = useRefundState({
    vendor_id: envVal('VITE_VENDOR_ID', 'v_test'),
    cashier_id,
    terminal_id: envVal('VITE_TERMINAL_ID', 'term_dev_1'),
  });

  const [receiptId, setReceiptId] = useState('HN-LOC-');
  const [searching, setSearching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleLookup() {
    const id = receiptId.trim();
    if (!id || id === 'HN-LOC-') {
      setLocalError('Enter a receipt ID');
      return;
    }
    setSearching(true);
    setLocalError(null);
    try {
      const sale = await fetchSale(id);
      refund.setSale(sale);
    } catch (e) {
      const err = e as { payload?: { error?: string; message?: string }; message?: string };
      setLocalError(
        err?.payload?.error ??
          err?.payload?.message ??
          err?.message ??
          'Could not load sale',
      );
    } finally {
      setSearching(false);
    }
  }

  // Keyboard shortcuts: Esc cancel, Enter process when ready
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && refund.readyToSubmit) {
        void refund.submit({ manager_id: 'm_default' });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, refund]);

  if (refund.success) {
    return (
      <div className="refund-root refund-tablet">
        <div className="refund-success">
          <div className="refund-success-icon">✓</div>
          <div className="refund-success-amount">{formatMinor(refund.success.refund_total_minor)} IQD</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Refund processed</div>
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

  const sale = refund.sale;
  const totalUnits = refund.selected.reduce((n, s) => n + s.qty, 0);

  return (
    <div className="refund-root refund-tablet">
      <header className="refund-tablet-header">
        <button type="button" className="back" onClick={onClose} aria-label="Close">
          ←
        </button>
        <div>
          <div className="refund-tablet-title">Return / Refund</div>
          <div className="refund-tablet-sub">Single-screen flow · cashier {cashier_id}</div>
        </div>
        <div className="spacer" />
        <div className="refund-tablet-kbd-hint">
          Shortcut · <kbd>F8</kbd> from register
        </div>
        <div className="refund-tablet-session-pill">DRAFT rfd_pending</div>
      </header>

      <div className="refund-tablet-layout">
        {/* LEFT: pick sale + receipt + reasons */}
        <div className="refund-card">
          <div className="refund-tablet-section-title">
            <span className="refund-tablet-step-chip">1</span> Pick the sale + lines to refund
          </div>

          <div className="refund-tablet-search">
            <input
              className="refund-input"
              value={receiptId}
              placeholder="HN-LOC-000000 — receipt ID, customer phone, or scan QR"
              onChange={(e) => setReceiptId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleLookup();
                }
              }}
            />
            <button
              type="button"
              className="refund-btn refund-btn-soft"
              onClick={handleLookup}
              disabled={searching}
            >
              {searching ? 'Loading…' : 'Lookup'}
            </button>
            <button type="button" className="refund-btn refund-btn-soft" onClick={() => setLocalError('Scanner not yet wired')}>
              📷 Scan QR
            </button>
          </div>

          {localError && <div className="refund-error" style={{ marginBottom: 10 }}>{localError}</div>}

          {sale && (
            <>
              <div className="refund-tablet-receipt-meta">
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Hanoot · Karrada Shop 01</div>
                  <div className="refund-mono" style={{ fontSize: 11, color: 'var(--gold-3)', fontWeight: 700 }}>
                    {sale.id}
                  </div>
                </div>
                <span className="refund-tablet-cust-pill">⭐ Returning customer</span>
              </div>

              <div className="refund-receipt">
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
                          <small>× {line.qty} · {formatMinor(line.unit_price_minor)} IQD each</small>
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
            </>
          )}

          {!sale && (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
              Enter a receipt ID or scan QR to load the sale.
            </div>
          )}
        </div>

        {/* RIGHT: method + PIN + summary */}
        <div className="refund-tablet-side">
          <div className="refund-card">
            <div className="refund-tablet-section-title">
              <span className="refund-tablet-step-chip">2</span> Refund method
            </div>
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
                <div className="sub">Adds to wallet</div>
              </button>
            </div>
          </div>

          <div className="refund-card">
            <div className="refund-tablet-section-title">
              <span className="refund-tablet-step-chip">3</span> Manager PIN
            </div>
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
            <div className="refund-tablet-section-title">
              <span className="refund-tablet-step-chip">∑</span> Summary
            </div>
            <div className="refund-sum-row">
              <span className="key">Items returned</span>
              <span className="val">
                {refund.selected.length} lines · {totalUnits} units
              </span>
            </div>
            {refund.selected.map((s) => {
              const line = sale?.lines.find((l) => l.id === s.line_id);
              if (!line) return null;
              return (
                <div className="refund-sum-row" key={s.line_id}>
                  <span className="key">
                    {line.title} ×{s.qty}
                  </span>
                  <span className="val">
                    {formatMinor(s.qty * line.unit_price_minor)} IQD ·{' '}
                    {REASON_LABEL[s.reason ?? 'other'] ?? s.reason ?? '—'}
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
              before/after JSON captured for compliance
            </div>
          </div>

          {refund.error && <div className="refund-error">{refund.error}</div>}
        </div>
      </div>

      <div className="refund-tablet-foot">
        <div className="refund-foot-summary">
          <span className="lab">Refund total</span>
          <span className="amt">{formatMinor(refund.refundTotalMinor)} IQD</span>
        </div>
        <div className="refund-tablet-kbd-hint">
          <kbd>Esc</kbd> cancel · <kbd>Enter</kbd> process
        </div>
        <button type="button" className="refund-btn refund-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="refund-btn refund-btn-danger"
          onClick={() => void refund.submit({ manager_id: 'm_default' })}
          disabled={!refund.readyToSubmit}
        >
          Process refund · {formatMinor(refund.refundTotalMinor)} IQD
        </button>
      </div>
    </div>
  );
}
