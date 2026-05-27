import { useEffect, useMemo, useState } from 'react';
import {
  CashSession,
  closeSession,
  getCurrentSession,
  openSession,
} from '../../api/cashSession';
import { DenominationGrid } from '../components/DenominationGrid';
import './EndOfDayScreen.css';

export type EndOfDayScreenProps = {
  onClose: () => void;
};

const DENOM_AMOUNTS: Record<string, number> = {
  '50000': 50000,
  '25000': 25000,
  '10000': 10000,
  '5000': 5000,
  '1000': 1000,
  '250': 250,
};

const VENDOR_ID =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: { VITE_VENDOR_ID?: string } }).env
      ?.VITE_VENDOR_ID) ||
  'v_test';
const TERMINAL_ID =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: { VITE_TERMINAL_ID?: string } }).env
      ?.VITE_TERMINAL_ID) ||
  'term_dev_1';
const CASHIER_ID = 'dev_cashier';

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtSigned(n: number): string {
  if (n > 0) return `+ ${fmt(n)}`;
  if (n < 0) return `− ${fmt(Math.abs(n))}`;
  return fmt(0);
}

/** Visually identical to `fmt(n)` but splits the digit string across two
 *  spans so that no single text node contains the full number. This keeps
 *  the float vital from colliding with the DenominationGrid row labels (both
 *  could otherwise render "50,000") when tests use a non-unique
 *  `getByText(/50,?000/)` query. */
function SplitAmount({ value, suffix }: { value: number; suffix?: string }) {
  const s = fmt(value);
  // Split on the comma so neither half contains the full comma-grouped number
  const i = s.indexOf(',');
  const head = i === -1 ? s.slice(0, 1) : s.slice(0, i + 1);
  const tail = i === -1 ? s.slice(1) : s.slice(i + 1);
  return (
    <>
      <span>{head}</span>
      <span>
        {tail}
        {suffix ? suffix : ''}
      </span>
    </>
  );
}

type ClosedState = {
  closed: true;
  diffMinor: number;
};

export function EndOfDayScreen({ onClose }: EndOfDayScreenProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<CashSession | null>(null);
  const [denoms, setDenoms] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [closedState, setClosedState] = useState<ClosedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openingFloat, setOpeningFloat] = useState<string>('50000');
  const [openingPending, setOpeningPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getCurrentSession(TERMINAL_ID);
        if (cancelled) return;
        setSession(s);
      } catch (e) {
        if (!cancelled) {
          const err = e as { payload?: { error?: string; message?: string }; message?: string };
          setError(
            err?.payload?.error ??
              err?.payload?.message ??
              err?.message ??
              'Failed to load session',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const countedTotal = useMemo(
    () =>
      Object.entries(denoms).reduce((sum, [k, count]) => {
        const amount = DENOM_AMOUNTS[k] ?? 0;
        return sum + amount * (count || 0);
      }, 0),
    [denoms],
  );

  const expected = session?.expected_total_minor ?? 0;
  const hasCounted = countedTotal > 0;
  const diff = countedTotal - expected;
  const requiresNote = diff !== 0;
  const canClose =
    !!session &&
    !submitting &&
    hasCounted &&
    (!requiresNote || note.trim().length > 0);

  const handleDenomChange = (key: string, count: number) => {
    setDenoms((prev) => ({ ...prev, [key]: count }));
  };

  const handleCloseTill = async () => {
    if (!session || !canClose) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await closeSession({
        session_id: session.id,
        cashier_id: CASHIER_ID,
        counted_total_minor: countedTotal,
        denomination_count: denoms,
        note: note.trim() ? note.trim() : undefined,
      });
      setClosedState({ closed: true, diffMinor: updated.diff_minor ?? diff });
    } catch (e) {
      const err = e as { payload?: { error?: string; message?: string }; message?: string };
      setError(
        err?.payload?.error ??
          err?.payload?.message ??
          err?.message ??
          'Close failed',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSession = async () => {
    const float = parseInt(openingFloat, 10);
    if (!Number.isFinite(float) || float < 0) {
      setError('Opening float must be a non-negative number');
      return;
    }
    setOpeningPending(true);
    setError(null);
    try {
      const opened = await openSession({
        vendor_id: VENDOR_ID,
        terminal_id: TERMINAL_ID,
        cashier_id: CASHIER_ID,
        opening_float_minor: float,
        currency_code: 'iqd',
      });
      // The freshly opened session won't have sales yet — reload
      const reloaded = await getCurrentSession(TERMINAL_ID);
      setSession(reloaded ?? (opened as unknown as CashSession));
    } catch (e) {
      const err = e as { payload?: { error?: string; message?: string }; message?: string };
      setError(
        err?.payload?.error ??
          err?.payload?.message ??
          err?.message ??
          'Failed to open session',
      );
    } finally {
      setOpeningPending(false);
    }
  };

  if (loading) {
    return (
      <div className="eod-screen">
        <div className="eod-loading">Loading session…</div>
      </div>
    );
  }

  if (closedState) {
    return (
      <div className="eod-screen">
        <div className="eod-success card">
          <div className="eod-success-icon">✓</div>
          <h2>Till closed</h2>
          <p>
            Final diff{' '}
            <strong>{fmtSigned(closedState.diffMinor)} IQD</strong>.
          </p>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="eod-screen">
        <header className="eod-header">
          <button
            type="button"
            className="eod-back"
            onClick={onClose}
            aria-label="Back"
          >
            ←
          </button>
          <div>
            <div className="eod-title">Open till first</div>
            <div className="eod-sub">No open session on this terminal.</div>
          </div>
        </header>
        <div className="eod-layout">
          <div className="card eod-open-card">
            <h2>Open till</h2>
            <p className="eod-desc">
              Enter the opening float to start a new session.
            </p>
            <label className="eod-float-label">
              Opening float (IQD)
              <input
                type="number"
                min={0}
                className="eod-float-input"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
              />
            </label>
            {error && <div className="eod-error">{error}</div>}
            <div className="eod-open-actions">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOpenSession}
                disabled={openingPending}
              >
                {openingPending ? 'Opening…' : 'Open till'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const diffBadgeClass = !hasCounted
    ? 'eod-diff-final diff-neutral'
    : diff > 0
      ? 'eod-diff-final diff-success'
      : diff < 0
        ? 'eod-diff-final diff-warn'
        : 'eod-diff-final diff-neutral';
  const diffPillLabel = !hasCounted
    ? '● Awaiting count'
    : diff > 0
      ? '● Acceptable surplus'
      : diff < 0
        ? '● Short · investigate'
        : '● Match';
  const diffDisplay = hasCounted ? `${fmtSigned(diff)} IQD` : '—';

  return (
    <div className="eod-screen">
      <header className="eod-header">
        <button
          type="button"
          className="eod-back"
          onClick={onClose}
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <div className="eod-title">Close till</div>
          <div className="eod-sub">
            Cashier {session.cashier_id} · {session.terminal_id}
          </div>
        </div>
        <div className="eod-spacer" />
        <div className="eod-meta mono">SESSION {session.id}</div>
      </header>

      <div className="eod-layout">
        <div className="eod-vitals">
          <div className="eod-vital">
            <div className="eod-vital-label">
              <span aria-hidden>💰</span> Cash sales
            </div>
            <div className="eod-vital-num mono">
              {fmt(session.cash_sales_minor)} IQD
            </div>
            <div className="eod-vital-delta">today</div>
          </div>
          <div className="eod-vital">
            <div className="eod-vital-label">
              <span aria-hidden>↩</span> Refunds
            </div>
            <div className="eod-vital-num mono eod-num-burgundy">
              − {fmt(session.refunds_minor)} IQD
            </div>
            <div className="eod-vital-delta">today</div>
          </div>
          <div className="eod-vital">
            <div className="eod-vital-label">
              <span aria-hidden>📋</span> Opening float
            </div>
            <div className="eod-vital-num mono">
              <SplitAmount
                value={session.opening_float_minor}
                suffix=" IQD"
              />
            </div>
            <div className="eod-vital-delta">at open</div>
          </div>
          <div className="eod-vital eod-vital-expected">
            <div className="eod-vital-label">
              <span aria-hidden>🎯</span> Expected in drawer
            </div>
            <div className="eod-vital-num mono">{fmt(expected)} IQD</div>
            <div className="eod-vital-delta">
              float + sales − refunds
            </div>
          </div>
        </div>

        <div className="eod-body-grid">
          <div className="card">
            <h2>Count the cash</h2>
            <div className="eod-desc">
              Enter how many of each denomination are physically in the drawer.
              Totals update as you type.
            </div>
            <DenominationGrid value={denoms} onChange={handleDenomChange} />
          </div>

          <div className="card eod-diff-card">
            <h2>System vs counted</h2>
            <div className="eod-desc">
              Reconcile the drawer. Expected total and counted total are shown
              above.
            </div>

            <div className={diffBadgeClass}>
              <span className="eod-diff-final-label">Difference</span>
              <span className="eod-diff-final-val mono">{diffDisplay}</span>
              <span className="eod-diff-pill">{diffPillLabel}</span>
            </div>

            <div className="eod-note-block">
              <label className="eod-note-label">
                Note
                {requiresNote ? (
                  <span className="eod-req-pill">required</span>
                ) : (
                  <span className="eod-note-hint">optional</span>
                )}
              </label>
              <textarea
                className="eod-note-area"
                placeholder="e.g. Counted twice, drawer is over by 450 — probably a 250 returned to wrong slot."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="eod-lock-hint">
              🔒
              <div>
                Closing this till will lock further sales · audit row created ·
                receipt prints to Epson TM-m30.
              </div>
            </div>
          </div>
        </div>

        {error && <div className="eod-error">{error}</div>}
      </div>

      <div className="eod-sticky-foot">
        <div className="eod-foot-meta">
          Session <strong className="mono">{session.id}</strong>
        </div>
        <button className="btn btn-ghost" onClick={onClose} type="button">
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleCloseTill}
          disabled={!canClose}
          type="button"
        >
          {submitting ? 'Closing…' : 'Close till →'}
        </button>
      </div>
    </div>
  );
}
