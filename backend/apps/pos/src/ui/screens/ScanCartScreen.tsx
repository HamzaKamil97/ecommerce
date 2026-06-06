import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadByCode, collect, buildPricedLines } from '../../api/scanCarts';
import type { ScanCart } from '../../api/scanCarts';
import { ApiError } from '../../api/client';
import { useSession } from '../../state/session';
import { TERMINAL_ID, VENDOR_ID } from '../../env';
import './ScanCartScreen.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinor(n: number): string {
  return `${n.toLocaleString('en-US')} IQD`;
}

function getVendorId(): string {
  return VENDOR_ID || 'v_test';
}

function getTerminalId(): string {
  return TERMINAL_ID || 'term_pos01';
}

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return 'Cart not found. Check the code and try again.';
    if (err.status === 410) return 'This cart has expired. Ask the customer to scan again.';
    if (err.status === 409) return 'Cart unavailable — it may already be collected or there is insufficient stock.';
    if (err.status === 400) return 'Cannot collect: one or more weigh lines are missing a price.';
    return `Error: ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

// ─── Component ────────────────────────────────────────────────────────────────

type Phase = 'entry' | 'cart' | 'done';

export function ScanCartScreen() {
  const navigate = useNavigate();
  const cashier_id = useSession((s) => s.cashier_id) ?? '';
  const cashier_name = useSession((s) => s.cashier_name) ?? '';

  // Phase state
  const [phase, setPhase] = useState<Phase>('entry');

  // Code entry
  const [codeInput, setCodeInput] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Loaded cart
  const [cart, setCart] = useState<ScanCart | null>(null);

  // Weigh-line prices: keyed by line.id → number (entered IQD minor)
  const [weighPrices, setWeighPrices] = useState<Record<string, string>>({});

  // Collect state
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [saleResult, setSaleResult] = useState<{ sale_id: string; total_minor: number; change_due_minor: number } | null>(null);

  // Computed total
  const total = useMemo(() => {
    if (!cart) return 0;
    let sum = 0;
    for (const line of cart.lines) {
      if (line.weigh_at_counter) {
        const entered = Number(weighPrices[line.id] ?? '0');
        sum += (isNaN(entered) ? 0 : entered) * line.qty;
      } else {
        sum += line.unit_price_minor * line.qty;
      }
    }
    return sum;
  }, [cart, weighPrices]);

  // All weigh lines have been priced
  const allWeighPriced = useMemo(() => {
    if (!cart) return false;
    return cart.lines
      .filter((l) => l.weigh_at_counter)
      .every((l) => {
        const v = Number(weighPrices[l.id] ?? '');
        return !isNaN(v) && v > 0;
      });
  }, [cart, weighPrices]);

  const hasWeighLines = cart ? cart.lines.some((l) => l.weigh_at_counter) : false;
  const canCollect = cart && (!hasWeighLines || allWeighPriced) && total > 0;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function handleLoad() {
    const code = codeInput.trim();
    if (!code) return;
    setLoadError(null);
    setLoading(true);
    try {
      const loaded = await loadByCode(code);
      setCart(loaded);
      setWeighPrices({});
      setCollectError(null);
      setPhase('cart');
    } catch (err) {
      setLoadError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCollect() {
    if (!cart || !cashier_id) return;
    setCollectError(null);

    // Build priceByLineId from entered weigh prices
    const priceByLineId: Record<string, number> = {};
    for (const [id, val] of Object.entries(weighPrices)) {
      priceByLineId[id] = Number(val);
    }

    let priced_lines: Array<{ line_id: string; unit_price_minor: number }>;
    try {
      priced_lines = buildPricedLines(cart.lines, priceByLineId);
    } catch (err) {
      setCollectError(err instanceof Error ? err.message : 'Missing weigh price');
      return;
    }

    setCollecting(true);
    try {
      const result = await collect(cart.id, {
        cashier_id,
        terminal_id: getTerminalId(),
        priced_lines,
        paid_amount_minor: total,
      });
      setSaleResult(result.sale);
      setPhase('done');
    } catch (err) {
      setCollectError(friendlyError(err));
    } finally {
      setCollecting(false);
    }
  }

  function handleReset() {
    setPhase('entry');
    setCodeInput('');
    setCart(null);
    setWeighPrices({});
    setLoadError(null);
    setCollectError(null);
    setSaleResult(null);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const vendorId = getVendorId();
  const terminalId = getTerminalId();

  return (
    <div className="sc-root">
      {/* Header */}
      <header className="sc-header">
        <button
          type="button"
          className="sc-back"
          aria-label="Back"
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <div className="sc-header-info">
          <div className="sc-title">Scan &amp; Go cart</div>
          <div className="sc-subtitle">
            {cashier_name ? cashier_name : 'Cashier'} · {terminalId}
            {cart ? <span className="sc-code-badge">{cart.short_code}</span> : null}
          </div>
        </div>
      </header>

      {/* ── Phase: ENTRY ── */}
      {phase === 'entry' && (
        <div className="sc-body">
          <div className="sc-code-section">
            <p className="sc-code-label">Enter the customer&apos;s cart code</p>
            <div className="sc-code-row">
              <input
                className="sc-code-input"
                type="text"
                placeholder="e.g. K74Q2"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleLoad(); }}
                autoFocus
                aria-label="Cart code"
              />
              <button
                type="button"
                className="sc-btn sc-btn-dark"
                onClick={() => void handleLoad()}
                disabled={loading || !codeInput.trim()}
              >
                {loading ? 'Loading…' : 'Load'}
              </button>
            </div>
            {loadError ? <div className="sc-error-banner">{loadError}</div> : null}
          </div>

          <div className="sc-notice">
            <span className="sc-notice-icon">ⓘ</span>
            <span>
              Ask the customer for the 5-character code from their Scan &amp; Go screen, or scan their QR.
            </span>
          </div>
        </div>
      )}

      {/* ── Phase: CART ── */}
      {phase === 'cart' && cart && (
        <>
          <div className="sc-body sc-body-scroll">
            {/* Lines */}
            {cart.lines.map((line) => (
              <div
                key={line.id}
                className={`sc-line-row${line.weigh_at_counter ? ' sc-line-weigh' : ''}`}
              >
                <div className="sc-line-info">
                  <div className="sc-line-title">{line.title}</div>
                  <div className="sc-line-sub">
                    {line.weigh_at_counter ? (
                      <span className="sc-weigh-tag">weigh → enter price</span>
                    ) : (
                      <span>×{line.qty}</span>
                    )}
                  </div>
                </div>
                {line.weigh_at_counter ? (
                  <div className="sc-weigh-entry">
                    <input
                      type="number"
                      className="sc-weigh-input"
                      min="0"
                      step="100"
                      placeholder="0"
                      value={weighPrices[line.id] ?? ''}
                      onChange={(e) =>
                        setWeighPrices((prev) => ({ ...prev, [line.id]: e.target.value }))
                      }
                      aria-label={`Price for ${line.title}`}
                    />
                    <span className="sc-weigh-unit">IQD</span>
                  </div>
                ) : (
                  <div className="sc-line-price num">
                    {(line.unit_price_minor * line.qty).toLocaleString('en-US')}
                  </div>
                )}
              </div>
            ))}

            {/* Info notice */}
            <div className="sc-notice" style={{ marginTop: 8 }}>
              <span className="sc-notice-icon">ⓘ</span>
              <span>Loading re-checks stock live. Taking cash decrements WMS &amp; closes the cart.</span>
            </div>

            {collectError ? <div className="sc-error-banner">{collectError}</div> : null}
          </div>

          {/* Footer */}
          <footer className="sc-footer">
            <div className="sc-total-row">
              <span className="sc-total-label">Cash due</span>
              <span className="sc-total-amount num">{formatMinor(total)}</span>
            </div>
            <button
              type="button"
              className="sc-btn sc-btn-cta"
              onClick={() => void handleCollect()}
              disabled={!canCollect || collecting}
            >
              {collecting ? 'Processing…' : 'Collect cash & finish'}
            </button>
          </footer>
        </>
      )}

      {/* ── Phase: DONE ── */}
      {phase === 'done' && saleResult && (
        <div className="sc-body sc-done">
          <div className="sc-done-icon" aria-hidden="true">✓</div>
          <h2 className="sc-done-title">Cart collected</h2>
          <p className="sc-done-sub">Stock has been decremented. Cart is now closed.</p>
          <div className="sc-done-detail">
            <div className="sc-done-row">
              <span>Sale ID</span>
              <span className="num">{saleResult.sale_id}</span>
            </div>
            <div className="sc-done-row">
              <span>Total</span>
              <span className="num">{formatMinor(saleResult.total_minor)}</span>
            </div>
            {saleResult.change_due_minor > 0 && (
              <div className="sc-done-row">
                <span>Change due</span>
                <span className="num sc-change">{formatMinor(saleResult.change_due_minor)}</span>
              </div>
            )}
            <div className="sc-done-row">
              <span>Cashier</span>
              <span>{cashier_name}</span>
            </div>
            <div className="sc-done-row">
              <span>Vendor</span>
              <span className="num">{vendorId}</span>
            </div>
          </div>
          <button
            type="button"
            className="sc-btn sc-btn-cta"
            style={{ marginTop: 24 }}
            onClick={handleReset}
          >
            Next cart
          </button>
        </div>
      )}
    </div>
  );
}
