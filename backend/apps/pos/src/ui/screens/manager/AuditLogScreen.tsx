import { useEffect, useState } from 'react';
import { listAuditLog, exportAuditLogUrl } from '../../../api/auditLog';
import type { AuditRow, AuditFilter } from '../../../api/auditLog';
import { DiffView } from '../../components/DiffView';
import { VENDOR_ID } from '../../../env';
import './AuditLogScreen.css';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MODULES = [
  'pos_terminal',
  'catalog',
  'wms',
  'inventory_count',
  'cash_session',
  'merch',
  'pos_cashier',
] as const;

type Module = (typeof MODULES)[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function entryClass(r: AuditRow): string {
  const a = r.action.toLowerCase();
  if (a.includes('security') || a.includes('pin') || a.includes('block')) return 'security';
  if (a.includes('create') || a.includes('add')) return 'create';
  if (a.includes('delete') || a.includes('remove')) return 'delete';
  if (a.includes('update') || a.includes('edit') || a.includes('adjust')) return 'update';
  return '';
}

function entryIcon(r: AuditRow): string {
  const m = r.module.toLowerCase();
  const a = r.action.toLowerCase();
  if (a.includes('security') || a.includes('pin')) return '⚠';
  if (m.includes('pos_terminal') && a.includes('create')) return '🧾';
  if (m.includes('catalog')) return '✎';
  if (m.includes('wms') || m.includes('inventory')) return '📦';
  if (m.includes('cash')) return '💵';
  return '●';
}

// ─── Timeline Entry ───────────────────────────────────────────────────────────

function TimelineEntry({ r }: { r: AuditRow }) {
  const [expanded, setExpanded] = useState(false);
  const cls = entryClass(r);
  const icon = entryIcon(r);
  const hasDiff =
    (r.before_json && Object.keys(r.before_json).length > 0) ||
    (r.after_json && Object.keys(r.after_json).length > 0);

  return (
    <li className={`al-entry${cls ? ` ${cls}` : ''}`}>
      <button
        type="button"
        className="entry-head"
        aria-expanded={expanded}
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="entry-ic" aria-hidden>
          {icon}
        </div>
        <div className="entry-body">
          <div className="who-what">
            <span className="verb-tag">{r.action}</span>
            {r.actor_id && <span className="who">{r.actor_id}</span>}
            {r.module && <span>in {r.module}</span>}
            {r.entity_id && <span className="target">{r.entity_id}</span>}
          </div>
        </div>
        <div className="entry-when">{formatTime(r.created_at)}</div>
      </button>
      {expanded && hasDiff && <DiffView before={r.before_json} after={r.after_json} />}
    </li>
  );
}

// ─── Summary computations ─────────────────────────────────────────────────────

function computeSummary(rows: AuditRow[]) {
  const salesRung = rows.filter(
    (r) =>
      (r.module === 'pos_terminal' || r.module === 'pos_cashier') &&
      r.action.toLowerCase().includes('create'),
  ).length;

  const refunds = rows.filter(
    (r) => r.module === 'pos_terminal' && r.action.toLowerCase().includes('refund'),
  ).length;

  const security = rows.filter(
    (r) =>
      r.action.toLowerCase().includes('security') ||
      r.action.toLowerCase().includes('pin') ||
      r.action.toLowerCase().includes('block'),
  ).length;

  return { actionsToday: rows.length, salesRung, refunds, security };
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function AuditLogScreen() {
  const vendorId = VENDOR_ID;

  const [actorId, setActorId] = useState<string | undefined>(undefined);
  const [moduleFilter, setModuleFilter] = useState<Module | undefined>(undefined);

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const filter: AuditFilter = {
    vendor_id: vendorId,
    actor_id: actorId,
    module: moduleFilter,
    limit: 100,
  };

  useEffect(() => {
    setLoading(true);
    listAuditLog(filter)
      .then((page) => {
        setRows(page.rows);
        setTotal(page.total);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, actorId, moduleFilter]);

  const summary = computeSummary(rows);
  const csvUrl = exportAuditLogUrl(filter);

  return (
    <div className="audit-log-screen">
      {/* Header */}
      <div className="al-header">
        <div>
          <h1>Audit log</h1>
          <div className="al-sub">Full activity trail · before/after diff · CSV export</div>
        </div>
        <div className="h-spacer" />
      </div>

      {/* Shell: sidebar + main */}
      <div className="al-shell">
        {/* Sidebar filters */}
        <aside aria-label="Filters" className="al-side">
          {/* Actor section */}
          <div className="al-side-label">Actor</div>
          <button
            type="button"
            className={`al-side-row${actorId === undefined ? ' on' : ''}`}
            onClick={() => setActorId(undefined)}
          >
            <div className="av mod">👤</div>
            <span>All actors</span>
            <span className="count">{total}</span>
          </button>

          <div className="al-side-divider" />

          {/* Module section */}
          <div className="al-side-label">Module</div>
          <button
            type="button"
            className={`al-side-row${moduleFilter === undefined ? ' on' : ''}`}
            onClick={() => setModuleFilter(undefined)}
          >
            <div className="av mod">◉</div>
            <span>All</span>
          </button>
          {MODULES.map((mod) => {
            const count = rows.filter((r) => r.module === mod).length;
            return (
              <button
                key={mod}
                type="button"
                className={`al-side-row${moduleFilter === mod ? ' on' : ''}`}
                onClick={() => setModuleFilter(moduleFilter === mod ? undefined : mod)}
              >
                <div className="av mod">📦</div>
                <span>{mod}</span>
                <span className="count">{count}</span>
              </button>
            );
          })}
        </aside>

        {/* Main */}
        <main className="al-main">
          {/* Chip bar */}
          <div className="al-topbar">
            {actorId && (
              <div className="al-chip">
                <span>👤 {actorId}</span>
                <button
                  type="button"
                  className="x"
                  aria-label={`Clear actor filter ${actorId}`}
                  onClick={() => setActorId(undefined)}
                >
                  ×
                </button>
              </div>
            )}
            {moduleFilter && (
              <div className="al-chip">
                <span>📦 {moduleFilter}</span>
                <button
                  type="button"
                  className="x"
                  aria-label={`Clear module filter ${moduleFilter}`}
                  onClick={() => setModuleFilter(undefined)}
                >
                  ×
                </button>
              </div>
            )}
            <a href={csvUrl} download className="al-export">
              📥 Export CSV
            </a>
          </div>

          {/* Summary strip */}
          <div role="region" aria-label="Summary" className="al-summary">
            <div className="stat-tile">
              <div className="lbl">Actions today</div>
              <div className="val">{summary.actionsToday}</div>
              <div className="trend">current page</div>
            </div>
            <div className="stat-tile">
              <div className="lbl">Sales rung</div>
              <div className="val ok">{summary.salesRung}</div>
              <div className="trend">pos_terminal creates</div>
            </div>
            <div className="stat-tile">
              <div className="lbl">Refunds</div>
              <div className="val warn">{summary.refunds}</div>
              <div className="trend">refund actions</div>
            </div>
            <div className="stat-tile">
              <div className="lbl">Security events</div>
              <div className="val crit">{summary.security}</div>
              <div className="trend">security / PIN / block</div>
            </div>
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="al-loading">Loading audit log…</div>
          ) : (
            <ul className="al-timeline">
              {rows.map((r) => (
                <TimelineEntry key={r.id} r={r} />
              ))}
            </ul>
          )}

          {/* Footer */}
          <div className="al-footer">{total} total rows</div>
        </main>
      </div>
    </div>
  );
}
