import { useMemo, useState } from 'react';
import {
  CountLine,
  CountReason,
  CountSession,
  addCountLine,
  applyCount,
  openCount,
} from '../../api/inventoryCount';
import { findByBarcode } from '../../db/catalog-sync';
import { Badge } from '../components/Badge';
import { ScanZone } from '../components/ScanZone';
import './StockCountScreen.css';

export type StockCountScreenProps = {
  onClose: () => void;
};

type Scope = 'all' | 'department' | 'specific';

const DEPARTMENTS = ['Dairy', 'Bakery', 'Beverages', 'Frozen', 'Pantry'];

const REASONS: Array<{ key: CountReason; label: string; danger?: boolean }> = [
  { key: 'damaged', label: 'Damaged', danger: true },
  { key: 'theft', label: 'Theft', danger: true },
  { key: 'miscount', label: 'Miscount' },
  { key: 'received_late', label: 'Received late' },
  { key: 'expired', label: 'Expired', danger: true },
];

const VENDOR_ID =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: { VITE_VENDOR_ID?: string } }).env
      ?.VITE_VENDOR_ID) ||
  'v_test';
const ACTOR_ID = 'dev_cashier';

type DisplayLine = CountLine & { name?: string; sku?: string | null };

function fmtSigned(n: number): string {
  if (n > 0) return `+ ${n}`;
  if (n < 0) return `− ${Math.abs(n)}`;
  return '0';
}

function diffVariant(d: number): 'ok' | 'crit' | 'quiet' {
  if (d > 0) return 'ok';
  if (d < 0) return 'crit';
  return 'quiet';
}

export function StockCountScreen({ onClose }: StockCountScreenProps) {
  const [scope, setScope] = useState<Scope>('all');
  const [department, setDepartment] = useState<string>('Dairy');
  const [session, setSession] = useState<CountSession | null>(null);
  const [lines, setLines] = useState<DisplayLine[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopeKey = useMemo(() => {
    if (scope === 'department') return `department:${department}`;
    return scope;
  }, [scope, department]);

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      const s = await openCount({
        vendor_id: VENDOR_ID,
        actor_id: ACTOR_ID,
        scope: scopeKey,
      });
      setSession(s);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to open count';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleScan(code: string) {
    if (!session || !code) return;
    const trimmed = code.trim();
    if (!trimmed) return;
    setScanInput('');
    const found = await findByBarcode(trimmed);
    if (!found) {
      setError(`No product for code ${trimmed}`);
      return;
    }
    setError(null);
    // For v1: system_qty placeholder = 1 unless catalog row provides on_hand
    const systemQty =
      typeof (found as { on_hand?: number }).on_hand === 'number'
        ? (found as { on_hand: number }).on_hand
        : 1;
    try {
      const line = await addCountLine(session.id, {
        variant_id: (found as { variant_id: string }).variant_id,
        system_qty: systemQty,
        actual_qty: systemQty,
      });
      const named: DisplayLine = {
        ...line,
        name: (found as { name?: string }).name,
        sku: (found as { sku?: string | null }).sku ?? trimmed,
      };
      setLines((cur) => [...cur, named]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add line';
      setError(msg);
    }
  }

  function updateActual(idx: number, raw: string) {
    setLines((cur) =>
      cur.map((ln, i) => {
        if (i !== idx) return ln;
        const parsed = parseInt(raw, 10);
        const actual = Number.isFinite(parsed) ? parsed : 0;
        return { ...ln, actual_qty: actual, delta: actual - ln.system_qty };
      }),
    );
  }

  function updateReason(idx: number, reason: CountReason) {
    setLines((cur) =>
      cur.map((ln, i) =>
        i === idx ? { ...ln, reason: ln.reason === reason ? null : reason } : ln,
      ),
    );
  }

  async function handleApply() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const res = await applyCount(session.id, { actor_id: ACTOR_ID });
      if ('partial' in res && res.partial) {
        setError(
          `Partial: applied ${res.applied_line_index} lines, failed on variant ${res.failed_variant_id}`,
        );
      } else {
        onClose();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to apply count';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleSaveDraft() {
    // v1: draft just keeps the session open; close the screen
    onClose();
  }

  // ─── Summary maths ───────────────────────────────────────────────
  const netDelta = lines.reduce((acc, ln) => acc + ln.delta, 0);
  const shrinkage = lines.filter((ln) => ln.delta < 0).length;
  const unchanged = lines.filter((ln) => ln.delta === 0).length;
  const reasonCounts: Record<string, number> = {};
  for (const ln of lines) {
    if (ln.reason) {
      reasonCounts[ln.reason] = (reasonCounts[ln.reason] ?? 0) + Math.abs(ln.delta);
    }
  }
  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];

  // ─── Render: scope picker (pre-session) ──────────────────────────
  if (!session) {
    return (
      <div className="sc-screen">
        <header className="sc-header">
          <button className="sc-back" onClick={onClose} aria-label="Back">
            ←
          </button>
          <div>
            <div className="sc-title">Stock count</div>
            <div className="sc-sub">
              Adjust on-hand · creates an audit-logged session
            </div>
          </div>
        </header>

        <div className="sc-layout">
          <div className="sc-main">
            <div className="scope-bar">
              <span className="sc-label">Scope · pick what you're counting</span>
              <div className="scope-pills">
                <button
                  type="button"
                  className={`scope-pill ${scope === 'all' ? 'active' : ''}`}
                  onClick={() => setScope('all')}
                >
                  <span className="ic">🏪</span>
                  <div>
                    <div className="name">Whole shop</div>
                    <div className="sub">1,247 SKUs · 4–6 hrs</div>
                  </div>
                </button>
                <button
                  type="button"
                  className={`scope-pill ${scope === 'department' ? 'active' : ''}`}
                  onClick={() => setScope('department')}
                >
                  <span className="ic">📂</span>
                  <div>
                    <div className="name">Department</div>
                    <div className="sub">
                      {scope === 'department'
                        ? `Filtered to ${department}`
                        : 'Pick a section'}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className={`scope-pill ${scope === 'specific' ? 'active' : ''}`}
                  onClick={() => setScope('specific')}
                >
                  <span className="ic">🎯</span>
                  <div>
                    <div className="name">Specific products</div>
                    <div className="sub">Scan or pick from list</div>
                  </div>
                </button>
              </div>
              {scope === 'department' ? (
                <div className="sub-chips">
                  <span className="sc-label" style={{ marginRight: 4 }}>
                    Departments
                  </span>
                  {DEPARTMENTS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`sub-chip ${department === d ? 'selected' : ''}`}
                      onClick={() => setDepartment(d)}
                    >
                      {d}
                      {department === d ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {error ? <div className="sc-error">{error}</div> : null}
          </div>
        </div>

        <div className="sticky-foot">
          <div className="foot-meta">
            Session paused? Resume from <strong>Catalog › Stock count history</strong>.
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={busy}
          >
            Start count →
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: counting UI ─────────────────────────────────────────
  return (
    <div className="sc-screen">
      <header className="sc-header">
        <button className="sc-back" onClick={onClose} aria-label="Back">
          ←
        </button>
        <div>
          <div className="sc-title">Stock count</div>
          <div className="sc-sub">
            Adjust on-hand · creates an audit-logged session
          </div>
        </div>
        <div className="sc-spacer" />
        <div className="session-pill">SESSION {session.id}</div>
      </header>

      <div className="sc-layout">
        <div className="sc-main">
          <ScanZone
            active
            hint="Scan to add to count"
            subHint="Barcode reader active · type product code below"
            onCode={handleScan}
          />
          <div className="scan-search-wrap">
            <input
              className="scan-search"
              placeholder="Find product · barcode · SKU"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleScan(scanInput);
                }
              }}
            />
          </div>

          {error ? <div className="sc-error">{error}</div> : null}

          <div className="count-card">
            <div className="count-head">
              <span className="title">Counted items</span>
              <span className="count-pill">{lines.length} lines</span>
            </div>

            {lines.length === 0 ? (
              <div className="cnt-empty">
                Scan or type a barcode above to add the first item.
              </div>
            ) : (
              lines.map((ln, i) => (
                <div key={ln.id} className="cnt-row">
                  <div className="cnt-thumb">📦</div>
                  <div>
                    <div className="cnt-name">{ln.name ?? ln.variant_id}</div>
                    <small>{ln.sku ? `SKU ${ln.sku}` : ln.variant_id}</small>
                  </div>
                  <div className="cnt-sys">{ln.system_qty}</div>
                  <input
                    className="cnt-input"
                    type="number"
                    value={ln.actual_qty}
                    onChange={(e) => updateActual(i, e.target.value)}
                    aria-label={`Actual quantity for ${ln.name ?? ln.variant_id}`}
                  />
                  <Badge
                    variant={diffVariant(ln.delta)}
                    className={`diff-badge diff-${diffVariant(ln.delta)}`}
                  >
                    {fmtSigned(ln.delta)}
                  </Badge>
                  <div className="reason-pills">
                    {REASONS.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        className={`reason-pill ${r.danger ? 'danger' : ''} ${
                          ln.reason === r.key ? 'selected' : ''
                        }`}
                        onClick={() => updateReason(i, r.key)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="summary">
          <h2>Summary</h2>
          <div className="desc">
            Live as you count. Apply at the bottom to commit stock movements + an
            audit row.
          </div>

          <div className="metric">
            <div className="lab">Net delta</div>
            <div className={`num ${netDelta < 0 ? 'down' : ''}`}>
              {fmtSigned(netDelta)} units
            </div>
            <div className="delta">
              across {lines.length} SKUs · {unchanged} unchanged · {shrinkage}{' '}
              shrinkage
            </div>
          </div>

          <div className="metric">
            <div className="lab">Top reason</div>
            <div className="num" style={{ fontSize: 16 }}>
              {topReason
                ? `${REASONS.find((r) => r.key === topReason[0])?.label ?? topReason[0]} · ${topReason[1]} units`
                : '—'}
            </div>
          </div>

          <div className="sc-note">
            🔒 Applying commits stock movements and writes one audit row. The
            shop owner is notified.
          </div>
        </aside>
      </div>

      <div className="sticky-foot">
        <div className="foot-meta">
          {lines.length} lines · {fmtSigned(netDelta)} net delta
        </div>
        <button className="btn btn-ghost" onClick={handleSaveDraft} disabled={busy}>
          Save draft
        </button>
        <button
          className="btn btn-primary"
          onClick={handleApply}
          disabled={busy}
        >
          Apply count →
        </button>
      </div>
    </div>
  );
}
