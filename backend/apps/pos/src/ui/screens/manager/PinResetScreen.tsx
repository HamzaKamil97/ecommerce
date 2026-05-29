import { useEffect, useState } from 'react';
import { listStaff, resetPin } from '../../../api/staff';
import type { StaffRow } from '../../../api/staff';
import { VENDOR_ID } from '../../../env';
import './PinResetScreen.css';

// ─── Capability resolution ───────────────────────────────────────────────────

const CAP_KEYS = ['pos.refund_or_void', 'pos.return_process', 'pos.end_of_day'] as const;

type CapKey = (typeof CAP_KEYS)[number];

// Default capability values for cashier role (also used for data_entry / picker fallback)
const ROLE_DEFAULTS_CASHIER: Record<CapKey, 'pin' | boolean> = {
  'pos.refund_or_void': 'pin',
  'pos.return_process': 'pin',
  'pos.end_of_day': true,
};

type PillVariant = 'allow' | 'pin' | 'deny' | 'override-on' | 'override-off';

interface CapPill {
  variant: PillVariant;
  label: string;
}

function resolveLabel(row: StaffRow, key: CapKey): CapPill {
  const override = row.permission_overrides[key];

  if (override === true) {
    return { variant: 'override-on', label: '★ Override ON' };
  }
  if (override === false) {
    return { variant: 'override-off', label: '⛔ Override OFF' };
  }

  // No override — use role default
  if (row.role === 'owner' || row.role === 'manager') {
    return { variant: 'allow', label: 'Allowed' };
  }

  // cashier / data_entry / picker — use ROLE_DEFAULTS_CASHIER
  const def = ROLE_DEFAULTS_CASHIER[key];
  if (def === 'pin') return { variant: 'pin', label: 'PIN required' };
  if (def === true) return { variant: 'allow', label: 'Allowed' };
  return { variant: 'deny', label: 'Denied' };
}

// ─── PIN guards ──────────────────────────────────────────────────────────────

function isSequential(pin: string): boolean {
  if (pin.length !== 4) return false;
  const sequences = [
    '0123', '1234', '2345', '3456', '4567', '5678', '6789',
    '9876', '8765', '7654', '6543', '5432', '4321', '3210',
  ];
  return sequences.includes(pin);
}

function isRepeated(pin: string): boolean {
  return /^(\d)\1{3}$/.test(pin);
}

// ─── CapabilityPill ──────────────────────────────────────────────────────────

function CapabilityPill({ variant, label }: CapPill) {
  return (
    <span className={`pin-reset-screen__cap pin-reset-screen__cap--${variant}`}>
      {variant !== 'override-on' && variant !== 'override-off' && (
        <span className="pin-reset-screen__cap-dot" />
      )}
      {label}
    </span>
  );
}

// ─── Avatar helper ───────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function avatarColorClass(role: StaffRow['role']): string {
  if (role === 'owner' || role === 'manager') return 'gold';
  if (role === 'cashier') return 'emerald';
  return 'neutral';
}

// ─── PinModal ────────────────────────────────────────────────────────────────

interface PinModalProps {
  staffRow: StaffRow;
  onClose: () => void;
  onSave: (id: string, pin: string) => Promise<void>;
}

function PinModal({ staffRow, onClose, onSave }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  const sequential = isSequential(pin);
  const repeated = isRepeated(pin);
  const canSave = pin.length === 4 && !sequential && !repeated;

  function handleDigit(d: string) {
    if (pin.length < 4) setPin((p) => p + d);
  }

  function handleBackspace() {
    setPin((p) => p.slice(0, -1));
  }

  function handleRandomize() {
    // Generate random 4-digit pin (may be sequential/repeated — that's shown as error)
    const digits = Array.from({ length: 4 }, () => String(Math.floor(Math.random() * 10)));
    setPin(digits.join(''));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(staffRow.id, pin);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pin-reset-screen__backdrop">
      <div
        className="pin-reset-screen__modal"
        role="dialog"
        aria-label="Reset PIN"
        aria-modal="true"
      >
        {/* Modal header */}
        <div className="pin-reset-screen__modal-head">
          <div className={`pin-reset-screen__av pin-reset-screen__av--${avatarColorClass(staffRow.role)}`}>
            {initials(staffRow.name)}
          </div>
          <div className="pin-reset-screen__modal-head-body">
            <h3>Reset PIN — {staffRow.name}</h3>
            <div className="pin-reset-screen__modal-meta">
              {staffRow.role.replace('_', ' ')}
            </div>
          </div>
          <button
            type="button"
            className="pin-reset-screen__modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Modal body */}
        <div className="pin-reset-screen__modal-body">
          <div className="pin-reset-screen__label-cap">Enter new 4-digit PIN</div>

          {/* PIN display cells */}
          <div className="pin-reset-screen__pin-display">
            {[0, 1, 2, 3].map((i) => {
              const isFilled = i < pin.length;
              const isCursor = i === pin.length && pin.length < 4;
              let cls = 'pin-reset-screen__pin-cell';
              if (isFilled) cls += ' pin-reset-screen__pin-cell--filled';
              if (isCursor) cls += ' pin-reset-screen__pin-cell--cursor';
              return (
                <div key={i} className={cls}>
                  {isFilled ? pin[i] : ''}
                </div>
              );
            })}
          </div>

          {/* Error messages */}
          {sequential && (
            <div className="pin-reset-screen__pin-error">
              Sequential PIN not allowed (e.g. 1234)
            </div>
          )}
          {repeated && (
            <div className="pin-reset-screen__pin-error">
              Repeated PIN not allowed (e.g. 1111)
            </div>
          )}

          {/* Numeric keypad */}
          <div className="pin-reset-screen__keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                className="pin-reset-screen__key"
                aria-label={d}
                onClick={() => handleDigit(d)}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              className="pin-reset-screen__key pin-reset-screen__key--dice"
              aria-label="Randomize PIN"
              onClick={handleRandomize}
            >
              🎲
            </button>
            <button
              type="button"
              className="pin-reset-screen__key"
              aria-label="0"
              onClick={() => handleDigit('0')}
            >
              0
            </button>
            <button
              type="button"
              className="pin-reset-screen__key pin-reset-screen__key--back"
              aria-label="Backspace"
              onClick={handleBackspace}
            >
              ⌫
            </button>
          </div>

          <p className="pin-reset-screen__hint">
            Sequential (1234) and repeated (1111) PINs are rejected automatically.
          </p>
        </div>

        {/* Modal actions */}
        <div className="pin-reset-screen__modal-actions">
          <button
            type="button"
            className="pin-reset-screen__btn pin-reset-screen__btn--cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pin-reset-screen__btn pin-reset-screen__btn--save"
            aria-label="Save · 4-digit PIN"
            disabled={!canSave || saving}
            onClick={handleSave}
          >
            {canSave ? `✓ Save · ${pin.split('').join('-')}` : '✓ Save · 4-digit PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PinResetScreen ──────────────────────────────────────────────────────────

export function PinResetScreen() {
  const vendorId = VENDOR_ID;
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listStaff(vendorId)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [vendorId]);

  const openRow = rows.find((r) => r.id === openId) ?? null;

  async function handleSave(id: string, pin: string) {
    await resetPin(id, pin);
    setOpenId(null);
  }

  return (
    <div className="pin-reset-screen">
      {/* Header */}
      <div className="pin-reset-screen__header">
        <div>
          <h1 className="pin-reset-screen__title">Quick PIN reset</h1>
          <div className="pin-reset-screen__subtitle">
            Reset staff PINs on the go — full staff management is in the admin app
          </div>
        </div>
      </div>

      <div className="pin-reset-screen__shell">
        {/* Scope note */}
        <div className="pin-reset-screen__scope-note">
          <div className="pin-reset-screen__scope-ic">ℹ</div>
          <div className="pin-reset-screen__scope-body">
            <h3>Cashier-side PIN reset · capabilities live in the admin app</h3>
            <p>
              Each cashier has a <strong>role default</strong> plus{' '}
              <strong>per-user overrides</strong> you control. Each row shows the resolved
              capabilities — green&nbsp;=&nbsp;allowed · gold&nbsp;=&nbsp;PIN re-prompt ·
              burgundy&nbsp;=&nbsp;denied · filled&nbsp;=&nbsp;explicit override.
            </p>
          </div>
        </div>

        {/* Staff card */}
        <div className="pin-reset-screen__staff-card">
          <div className="pin-reset-screen__staff-head">
            <h2>Staff with PoS access</h2>
            <span className="pin-reset-screen__count">
              <strong>{rows.length}</strong> active
            </span>
          </div>

          {loading ? (
            <div className="pin-reset-screen__loading">Loading staff…</div>
          ) : (
            <ul className="pin-reset-screen__staff-list" aria-label="Staff">
              {rows.map((row) => (
                <li key={row.id} className="pin-reset-screen__staff-row-wrap">
                  <div className="pin-reset-screen__staff-row">
                    <div
                      className={`pin-reset-screen__av pin-reset-screen__av--${avatarColorClass(row.role)}`}
                    >
                      {initials(row.name)}
                    </div>
                    <div className="pin-reset-screen__staff-info">
                      <div className="pin-reset-screen__nm">{row.name}</div>
                      <div className="pin-reset-screen__meta">
                        <span>{row.role.replace('_', ' ')}</span>
                        {row.last_active_at && (
                          <>
                            <span className="pin-reset-screen__dot" />
                            <span>{row.last_active_at}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={`pin-reset-screen__role-pill pin-reset-screen__role-pill--${row.role}`}
                    >
                      {row.role.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      className="pin-reset-screen__reset-btn"
                      aria-label={`Reset PIN for ${row.name}`}
                      onClick={() => setOpenId(row.id)}
                    >
                      ↺ Reset
                    </button>
                  </div>
                  {/* Capability pills row */}
                  <div className="pin-reset-screen__cap-row">
                    {CAP_KEYS.map((key) => {
                      const pill = resolveLabel(row, key);
                      return (
                        <CapabilityPill key={key} variant={pill.variant} label={pill.label} />
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Legend */}
        <aside className="pin-reset-screen__legend" aria-label="Capability legend">
          <div className="pin-reset-screen__legend-ic">🔑</div>
          <div className="pin-reset-screen__legend-body">
            <h3>Capability legend</h3>
            <p>
              <CapabilityPill variant="allow" label="Allowed" />
              {' '}by role default ·{' '}
              <CapabilityPill variant="pin" label="PIN required" />
              {' '}default for cashier ·{' '}
              <CapabilityPill variant="deny" label="Denied" />
              {' '}by role ·{' '}
              <CapabilityPill variant="override-on" label="★ Override ON" />
              {' '}owner-granted ·{' '}
              <CapabilityPill variant="override-off" label="⛔ Override OFF" />
              {' '}owner-denied
            </p>
          </div>
        </aside>
      </div>

      {/* PIN modal */}
      {openRow && (
        <PinModal
          staffRow={openRow}
          onClose={() => setOpenId(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
