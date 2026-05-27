import { Badge, BadgeVariant } from './Badge';
import type { AlertRow, AlertSeverity } from '../../api/alerts';
import './CashierAlertPanel.css';

export type CashierAlertPanelProps = {
  open: boolean;
  alerts: AlertRow[];
  onClose: () => void;
  onMarkAllRead: () => void;
};

const SEV_ICON: Record<AlertSeverity, string> = {
  critical: '🚫',
  warning: '⚠',
  info: 'ℹ',
};

const SEV_CLASS: Record<AlertSeverity, string> = {
  critical: 'crit',
  warning: 'warn',
  info: 'info',
};

const SEV_BADGE_VARIANT: Record<AlertSeverity, BadgeVariant> = {
  critical: 'crit',
  warning: 'warn',
  info: 'ok',
};

const SEV_LABEL: Record<AlertSeverity, string> = {
  critical: 'CRITICAL',
  warning: 'WARN',
  info: 'INFO',
};

function formatMeta(a: AlertRow): string {
  return a.message ?? '';
}

export function CashierAlertPanel({ open, alerts, onClose, onMarkAllRead }: CashierAlertPanelProps) {
  if (!open) return null;

  const count = alerts.length;

  return (
    <>
      <div className="alert-panel-scrim" onClick={onClose} aria-hidden="true" />
      <div className="alert-panel" role="dialog" aria-label="Alerts">
        <div className="alert-panel-head">
          <span className="alert-panel-title">Alerts</span>
          <span className="alert-panel-count">{count} active</span>
          <button type="button" className="alert-panel-mark" onClick={onMarkAllRead}>
            Mark all read
          </button>
        </div>

        {count === 0 ? (
          <div className="alert-panel-empty">No alerts right now</div>
        ) : (
          <div className="alert-panel-list">
            {alerts.map((a, idx) => {
              const sevClass = SEV_CLASS[a.severity];
              const unread = a.read_at === null;
              return (
                <div
                  key={a.id}
                  className={`alert-row ${sevClass} ${unread ? 'unread' : ''}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className={`sev-icon ${sevClass}`}>{SEV_ICON[a.severity]}</div>
                  <div className="alert-body">
                    <div className="alert-title">{a.title}</div>
                    <div className="alert-meta">{formatMeta(a)}</div>
                  </div>
                  <Badge variant={SEV_BADGE_VARIANT[a.severity]}>{SEV_LABEL[a.severity]}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
