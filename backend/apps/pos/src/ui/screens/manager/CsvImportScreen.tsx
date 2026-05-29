import { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { importCsv } from '../../../api/pos';
import { VENDOR_ID } from '../../../env';
import './CsvImportScreen.css';

// ── Re-exported helper (kept for backward compat with existing tests) ───────
export type PreviewResult = {
  headers: string[];
  rows: Record<string, string>[];
  totalRowCount: number;
};

export function previewCsv(csv: string, n: number): PreviewResult {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const data = parsed.data ?? [];
  return {
    headers: parsed.meta?.fields ?? [],
    rows: data.slice(0, n),
    totalRowCount: data.length,
  };
}

// ── Types ──────────────────────────────────────────────────────────────────
type ScreenState = 'idle' | 'uploading' | 'success' | 'error';

type RowError = { row: number; column?: string; reason: string };

interface CsvImportScreenProps {
  forceState?: ScreenState;
}

// Fixture data for the forced-success preview (Storybook / tests).
const DEMO_IMPORT_COUNT = 411;
const DEMO_ELAPSED_SEC = 47;
const DEMO_ERROR: RowError = { row: 24, column: 'price_minor', reason: 'not an integer' };

// ── Confetti ───────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#b88a3a', '#c89844', '#2f6a55', '#387762',
  '#d4a14e', '#862a3a', '#9d3548', '#e5dfd0', '#FFD56B',
];

function Confetti() {
  // Generate once per mount — re-randomizing on every render would restart the animation.
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 800,
        duration: 2000 + Math.random() * 1500,
        width: 4 + Math.random() * 6,
        height: 8 + Math.random() * 10,
      })),
    [],
  );

  return (
    <div className="csv-import-screen__confetti" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            width: `${p.width}px`,
            height: `${p.height}px`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function CsvImportScreen({ forceState }: CsvImportScreenProps) {
  const [state, setState] = useState<ScreenState>(
    forceState ?? 'idle',
  );
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [imported, setImported] = useState<number>(
    forceState === 'success' ? DEMO_IMPORT_COUNT : 0,
  );
  const [elapsedSec, setElapsedSec] = useState<number>(
    forceState === 'success' ? DEMO_ELAPSED_SEC : 0,
  );
  const [errors, setErrors] = useState<RowError[]>(
    forceState === 'success' ? [DEMO_ERROR] : [],
  );
  const [dragOver, setDragOver] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // If forceState changes (prop update), sync state
  useEffect(() => {
    if (forceState) {
      setState(forceState);
      if (forceState === 'success') {
        setImported(DEMO_IMPORT_COUNT);
        setElapsedSec(DEMO_ELAPSED_SEC);
        setErrors([DEMO_ERROR]);
      }
    }
  }, [forceState]);

  // Clear the fake-progress interval if we unmount mid-upload.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function onFile(f: File) {
    setFileName(f.name);
    setState('uploading');
    setProgress(10);

    const startedAt = Date.now();
    const text = await f.text();

    intervalRef.current = setInterval(() => {
      setProgress(p => Math.min(p + 12, 90));
    }, 200);

    try {
      const r = await importCsv(VENDOR_ID, text);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(100);
      setImported(r.created);
      setElapsedSec(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      setErrors(r.errors.map(e => ({ row: e.row, reason: e.reason })));
      setState('success');
    } catch {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setState('error');
    }
  }

  function resetToIdle() {
    setProgress(0);
    setFileName('');
    setImported(0);
    setElapsedSec(0);
    setErrors([]);
    setState('idle');
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="csv-import-screen">
      {/* Header */}
      <header className="csv-import-screen__header">
        <div className="csv-import-screen__header-left">
          <div className="csv-import-screen__page-title">Import CSV</div>
          <div className="csv-import-screen__page-sub">
            Bulk add products from spreadsheet · AI auto-categorizes
          </div>
        </div>
        <div className="csv-import-screen__header-spacer" />
        <button
          className="csv-import-screen__header-action"
          type="button"
          onClick={() => alert('Download CSV template — coming soon')}
        >
          📄 Download template
        </button>
      </header>

      {/* Visible heading for semantics / tests */}
      <h1 className="csv-import-screen__sr-heading">Import CSV</h1>

      <div className="csv-import-screen__shell">

        {/* ── IDLE ────────────────────────────────────────────────────── */}
        {state === 'idle' && (
          <>
            <label
              className={`csv-import-screen__dropzone${dragOver ? ' dragover' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
            >
              <input
                type="file"
                accept=".csv"
                aria-label="CSV file input"
                className="csv-import-screen__file-input"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
              <div className="csv-import-screen__cloud">☁</div>
              <h2 className="csv-import-screen__dropzone-title">Drop your CSV here</h2>
              <p className="csv-import-screen__dropzone-body">
                Or click to browse. We support UTF-8 CSV with comma separators.
                Up to <span className="mono">10,000</span> rows ·{' '}
                <span className="mono">25 MB</span> max.
              </p>
              <span className="csv-import-screen__browse-btn" aria-hidden="true">
                📁 Browse files
              </span>
            </label>

            <div className="csv-import-screen__format-card">
              <div className="csv-import-screen__format-ic">📋</div>
              <div className="csv-import-screen__format-info">
                <h4>Expected columns</h4>
                <p>
                  <code>title</code> · <code>price_minor</code> · <code>currency</code> ·{' '}
                  <code>category</code> · optional: <code>barcode</code>, <code>sku</code>,{' '}
                  <code>initial_on_hand</code>, <code>cost_price_minor</code>,{' '}
                  <code>supplier</code>, <code>tags</code> (semicolon-separated)
                </p>
              </div>
              <div className="csv-import-screen__format-links">
                <a href="#" className="csv-import-screen__format-link">📥 Template</a>
                <a href="#" className="csv-import-screen__format-link">📖 Guide</a>
              </div>
            </div>
          </>
        )}

        {/* ── UPLOADING ───────────────────────────────────────────────── */}
        {state === 'uploading' && (
          <div className="csv-import-screen__upload-card">
            <div className="csv-import-screen__file-row">
              <div className="csv-import-screen__file-ic">📄</div>
              <div className="csv-import-screen__file-info">
                <div className="csv-import-screen__file-name">
                  {fileName || 'uploading…'}
                </div>
                <div className="csv-import-screen__file-meta">
                  <span className="stat">Processing…</span>
                </div>
              </div>
              <div className="csv-import-screen__spinner" aria-hidden="true" />
            </div>

            <div className="csv-import-screen__progress-shell">
              <div
                className="csv-import-screen__progress-fill"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="csv-import-screen__progress-stats">
              <span className="csv-import-screen__progress-pct">{progress}%</span>
              <span className="csv-import-screen__progress-est">
                Processing &amp; validating…
              </span>
            </div>

            <div className="csv-import-screen__tip-banner">
              <div className="csv-import-screen__tip-dot">AI</div>
              <span>
                <strong>While we work:</strong> Hanoot AI is auto-suggesting departments and
                tags based on title + brand + barcode lookups.{' '}
                <em>⚡ AI is auto-categorizing — feel free to switch tabs.</em>
              </span>
            </div>
          </div>
        )}

        {/* ── SUCCESS ─────────────────────────────────────────────────── */}
        {state === 'success' && (
          <div className="csv-import-screen__success-card">
            <Confetti />

            <div className="csv-import-screen__check">✓</div>
            <h2 className="csv-import-screen__success-title">
              Imported in {elapsedSec} second{elapsedSec === 1 ? '' : 's'}
            </h2>
            <p className="csv-import-screen__summary">
              <strong>{imported} products</strong> added to your catalog.
              {errors.length > 0 && (
                <> <strong>{errors.length} rows</strong> had errors and weren't imported — fix and re-upload them below.</>
              )}
            </p>

            <div className="csv-import-screen__stat-grid">
              <div className="csv-import-screen__stat-tile">
                <div className="csv-import-screen__stat-lbl">Imported</div>
                <div className="csv-import-screen__stat-val ok">{imported}</div>
              </div>
              <div className="csv-import-screen__stat-tile">
                <div className="csv-import-screen__stat-lbl">Errors</div>
                <div className={`csv-import-screen__stat-val ${errors.length > 0 ? 'crit' : 'ok'}`}>
                  {errors.length}
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <div
                className="csv-import-screen__error-report"
                role="region"
                aria-label="Errors"
              >
                <div className="csv-import-screen__er-head">
                  <h3>⚠ Errors ({errors.length})</h3>
                  <span className="csv-import-screen__er-meta">
                    Fix and re-upload — Hanoot will detect added rows only
                  </span>
                </div>
                <div className="csv-import-screen__er-list">
                  {errors.map((e, i) => (
                    <div key={i} className="csv-import-screen__er-row">
                      <span className="csv-import-screen__er-row-n">Row {e.row}</span>
                      {e.column && (
                        <span className="csv-import-screen__er-col">{e.column}</span>
                      )}
                      <span className="csv-import-screen__er-reason">{e.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="csv-import-screen__success-actions">
              <button
                type="button"
                className="csv-import-screen__btn csv-import-screen__btn--secondary"
              >
                View imported products
              </button>
              <button
                type="button"
                className="csv-import-screen__btn csv-import-screen__btn--primary"
                onClick={resetToIdle}
              >
                📤 Re-upload
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────────────────────── */}
        {state === 'error' && (
          <div className="csv-import-screen__error-card">
            <div className="csv-import-screen__error-icon">✗</div>
            <h2 className="csv-import-screen__error-title">Upload failed</h2>
            <p className="csv-import-screen__error-body">
              Something went wrong while processing your CSV. Please check the file and try again.
            </p>
            <button
              type="button"
              className="csv-import-screen__btn csv-import-screen__btn--primary"
              onClick={resetToIdle}
            >
              Try again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
