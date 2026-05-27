import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrder, handoffOrder } from '../../api/onlineOrders';
import type { OnlineOrder, OnlineOrderLine } from '../../api/onlineOrders';
import './OrderDetailScreen.css';

function initials(name: string | null): string {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function formatMinor(n: number, currency: string): string {
  const code = (currency || 'iqd').toUpperCase();
  return `${n.toLocaleString('en-US')} ${code}`;
}

function formatTimeAgo(placed_at: string): string {
  const t = new Date(placed_at).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hr ago';
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(placed_at).toLocaleDateString();
}

export function OrderDetailScreen(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OnlineOrder | null | undefined>(undefined);
  const [lines, setLines] = useState<OnlineOrderLine[]>([]);
  const [handoffPending, setHandoffPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setOrder(null);
      return;
    }
    getOrder(id)
      .then((o) => {
        if (cancelled) return;
        setOrder(o);
        setLines(o?.lines ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setOrder(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pickedCount = useMemo(() => lines.filter((l) => l.picked).length, [lines]);
  const totalCount = lines.length;
  const progressPct = totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0;

  function togglePicked(lineId: string) {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, picked: !l.picked } : l)),
    );
  }

  function markUnavailable(lineId: string) {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, oos: true, picked: false } : l)),
    );
  }

  async function handleHandoff() {
    if (!order || handoffPending) return;
    setHandoffPending(true);
    try {
      await handoffOrder(order.id);
      navigate('/orders');
    } catch (e) {
      setHandoffPending(false);
    }
  }

  function handleCall() {
    if (!order?.customer_phone) return;
    try {
      window.open(`tel:${order.customer_phone}`);
    } catch {
      // noop
    }
  }

  if (order === undefined) {
    return (
      <div className="od-root">
        <div className="od-loading">Loading…</div>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="od-root">
        <div className="od-notfound">
          <div className="od-notfound-title">Order not found</div>
          <button className="od-btn od-btn-ghost" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const vendorNetMinor = order.total_minor - order.commission_minor;

  return (
    <div className="od-root">
      <header className="od-header">
        <button className="od-back-chev" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div>
          <div className="od-page-title">{order.id}</div>
          <div className="od-page-sub">
            Placed {formatTimeAgo(order.placed_at)} · Hanoot online order
          </div>
        </div>
        <span className="od-status-pill">● {order.status}</span>
        <div className="od-h-spacer" />
      </header>

      <div className="od-layout">
        <div className="od-col-main">
          {/* Customer card */}
          <section className="od-card">
            <h3 className="od-card-title">
              Customer <span className="od-label-mini">· verified · returning</span>
            </h3>
            <div className="od-customer">
              <div className="od-customer-avatar">{initials(order.customer_name)}</div>
              <div>
                <div className="od-customer-name">{order.customer_name || 'Guest'}</div>
                <div className="od-customer-phone mono">{order.customer_phone || '—'}</div>
                <div className="od-customer-stats">
                  <span className="od-cust-stat">
                    <strong>—</strong> prior orders
                  </span>
                  <span className="od-cust-stat">
                    Lifetime <strong>{formatMinor(order.total_minor, order.currency_code)}</strong>
                  </span>
                </div>
              </div>
              <button className="od-call-btn" onClick={handleCall} aria-label="Call customer">
                📞 Call
              </button>
            </div>
          </section>

          {/* Pick list */}
          <section className="od-card">
            <h3 className="od-card-title">
              Pick list{' '}
              <span className="od-label-mini">
                · {pickedCount} of {totalCount} picked
              </span>
            </h3>
            <div className="od-progress-meta">
              <div className="od-progress-bar">
                <div className="od-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="od-progress-text mono">
                {pickedCount} / {totalCount}
              </div>
            </div>

            <div className="od-pick-list">
              {lines.map((line) => (
                <div className="od-pick-row" key={line.id}>
                  <div
                    className={`od-checkbox ${line.picked ? 'checked' : ''}`}
                    onClick={() => togglePicked(line.id)}
                    role="checkbox"
                    aria-checked={line.picked}
                    aria-label={`Mark ${line.title} ${line.picked ? 'unpicked' : 'picked'}`}
                    tabIndex={0}
                  >
                    {line.picked ? '✓' : '·'}
                  </div>
                  <div className="od-pick-thumb">{line.oos ? '🛒' : '📦'}</div>
                  <div>
                    <div className={`od-pick-name ${line.oos ? 'oos' : ''}`}>{line.title}</div>
                    <small>
                      {line.oos ? (
                        <>
                          <a
                            className="od-oos-link"
                            onClick={() => markUnavailable(line.id)}
                          >
                            Mark unavailable →
                          </a>{' '}
                          · System says 0 in stock
                        </>
                      ) : (
                        <>
                          {formatMinor(line.unit_price_minor, order.currency_code)} ·{' '}
                          {formatMinor(line.line_total_minor, order.currency_code)} total
                        </>
                      )}
                    </small>
                  </div>
                  {line.aisle_hint ? (
                    <span className="od-aisle">{line.aisle_hint}</span>
                  ) : (
                    <span />
                  )}
                  <span className="od-pick-qty mono">× {line.qty}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="od-col-side">
          {/* Delivery + map */}
          <section className="od-card">
            <h3 className="od-card-title">
              Delivery <span className="od-label-mini">· map preview</span>
            </h3>
            <div className="od-map-preview" aria-label="Delivery map preview">
              <div className="od-map-pin" />
              <span className="od-map-label">Map preview</span>
            </div>
            <div className="od-address-text">
              {order.delivery_address ? (
                <strong>{order.delivery_address}</strong>
              ) : (
                <em>No address on file</em>
              )}
              {order.delivery_lat != null && order.delivery_lng != null && (
                <>
                  <br />
                  <span className="mono od-coords">
                    {order.delivery_lat.toFixed(4)}° N, {order.delivery_lng.toFixed(4)}° E
                  </span>
                </>
              )}
            </div>

            {order.voice_note_url ? (
              <div className="od-voice-note">
                <button className="od-play-btn" aria-label="Play voice note">
                  ▶
                </button>
                <div className="od-waveform" aria-hidden="true">
                  {[30, 60, 80, 40, 90, 50, 70, 30, 50, 80, 40, 65, 30, 55, 40].map((h, i) => (
                    <span key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <span className="od-voice-meta mono">0:12</span>
              </div>
            ) : (
              <div className="od-no-voice">No voice note</div>
            )}
          </section>

          {/* Summary */}
          <section className="od-card">
            <h3 className="od-card-title">Summary</h3>
            <div className="od-summary">
              <div className="od-summary-row">
                <span className="od-label">Subtotal</span>
                <span className="mono od-summary-val">
                  {formatMinor(order.total_minor, order.currency_code)}
                </span>
              </div>
              <div className="od-summary-row">
                <span className="od-label">Hanoot commission</span>
                <span className="mono od-summary-val od-summary-muted">
                  −{formatMinor(order.commission_minor, order.currency_code)}
                </span>
              </div>
              <hr className="od-summary-sep" />
              <div className="od-summary-row">
                <span className="od-summary-net-label">Vendor net</span>
                <span className="mono od-summary-net">
                  {formatMinor(vendorNetMinor, order.currency_code)}
                </span>
              </div>
              <div className="od-summary-foot">
                {(order.commission_rate_bps_snapshot / 100).toFixed(0)}% rate snapshot at
                confirmation
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="od-sticky-foot">
        <button className="od-btn od-btn-ghost" onClick={() => navigate(-1)}>
          Cancel order
        </button>
        <button
          className="od-btn od-btn-primary"
          onClick={handleHandoff}
          disabled={handoffPending}
        >
          {handoffPending ? 'Handing off…' : 'Hand to rider →'}
        </button>
      </div>
    </div>
  );
}

export default OrderDetailScreen;
