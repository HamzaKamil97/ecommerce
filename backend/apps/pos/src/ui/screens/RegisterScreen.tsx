import { useCallback, useState } from 'react';
import { useCart } from '../../state/cart';
import { useSession } from '../../state/session';
import { useResponsive } from '../../hooks/useResponsive';
import { CartList } from '../components/CartList';
import { ScanZone } from '../components/ScanZone';
import { findByBarcode } from '../../db/catalog-sync';
import { PaymentScreen } from './PaymentScreen';
import { SettingsScreen } from './SettingsScreen';
import './RegisterScreen.css';

const DEPARTMENTS = ['All', 'Dairy', 'Bakery', 'Beverages', 'Pantry', 'Frozen'];

const QUICK_TILES: Array<{ icon: string; name: string; meta: string }> = [
  { icon: '🥛', name: 'Milk 1L · Almarai', meta: '2,750 IQD · 18 in stock' },
  { icon: '🧈', name: 'Lurpak 100g', meta: '4,500 IQD · 6 in stock' },
  { icon: '🧀', name: 'White Cheese', meta: '5,250 IQD · 12 in stock' },
  { icon: '🥛', name: 'Yogurt 500g · Sara', meta: '2,000 IQD · 9 in stock' },
  { icon: '🥚', name: 'Eggs Tray · 30', meta: '7,000 IQD · 14 in stock' },
  { icon: '🥤', name: 'Coca-Cola 1L', meta: '1,750 IQD · 26 in stock' },
  { icon: '💧', name: 'Water 1.5L · Aqua', meta: '750 IQD · 48 in stock' },
  { icon: '🍵', name: 'Tea · Al-Afour', meta: '3,200 IQD · 22 in stock' },
];

type TabKey = 'departments' | 'favorites' | 'orders';

/** Full thousands-separator format (e.g. "13,500"). Used ONLY by the Charge button
 *  amount so it is the single canonical place where the exact total appears.
 */
function formatIQD(minor: number): string {
  return minor.toLocaleString('en-US');
}

/** Short k-format for ambient totals (header net, summary rows, etc.). */
function formatIQDShort(minor: number): string {
  if (minor < 1000) return `${minor}`;
  const k = minor / 1000;
  return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
}

export function RegisterScreen() {
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('departments');
  const [activeDept, setActiveDept] = useState<string>('All');

  const subtotal = useCart((s) => s.subtotalMinor());
  const lines = useCart((s) => s.lines);
  const cashierName = useSession((s) => s.cashier_name);
  const cashierRole = useSession((s) => s.role);

  const { isPhone } = useResponsive();

  const handleScan = useCallback(async (code: string) => {
    setError(null);
    const item = await findByBarcode(code);
    if (!item) {
      setError(`Unknown barcode: ${code}`);
      try { new Audio('/error.wav').play().catch(() => {}); } catch { /* noop */ }
      return;
    }
    useCart.getState().addLineFromScan({
      variant_id: item.variant_id,
      name: item.name,
      unit_price_minor: item.price_minor,
      qty: 1,
    });
    try { new Audio('/beep.wav').play().catch(() => {}); } catch { /* noop */ }
  }, []);

  if (payOpen) return <PaymentScreen onClose={() => setPayOpen(false)} />;
  if (settingsOpen) return <SettingsScreen onClose={() => setSettingsOpen(false)} />;

  // Scan is only wired when register is mounted. Pausing happens naturally:
  // payOpen / settingsOpen replace this whole screen → ScanZone unmounts → listener stops.
  const scanActive = !payOpen && !settingsOpen;

  const displayName = cashierName ?? 'Cashier';
  const initial = displayName.charAt(0).toUpperCase() || 'A';
  const roleLabel = cashierRole === 'manager' ? 'Manager' : 'Cashier';

  const chargeLabel = lines.length > 0
    ? `${formatIQD(subtotal)} IQD →`
    : '0 IQD';

  const itemCount = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="register-screen">

      {/* ─── Dark header ────────────────────────────────────────── */}
      <header className={`register-header${isPhone ? ' is-phone' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">H</div>
          {!isPhone && (
            <div>
              <div className="brand-name">Hanoot</div>
              <div className="brand-sub">Register · POS-01</div>
            </div>
          )}
          {isPhone && (
            <div>
              <div className="brand-name">Hanoot · Register</div>
              <div className="brand-sub">{displayName} · {roleLabel.toLowerCase()}</div>
            </div>
          )}
        </div>

        {!isPhone && (
          <div className="cashier-chip">
            <div className="cashier-avatar" aria-hidden="true">{initial}</div>
            <div>
              <div className="cashier-name">{displayName}</div>
              <div className="cashier-role">{roleLabel}</div>
            </div>
          </div>
        )}

        <div className="header-spacer" />

        {!isPhone && (
          <div className="net-total">
            <div className="label">Net today</div>
            <div className="num">{formatIQDShort(subtotal)} IQD</div>
          </div>
        )}

        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="Alerts"
            onClick={() => { /* C10 wires CashierAlertPanel */ }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {error && (
        <div className="register-error" role="alert">{error}</div>
      )}

      {/* ─── Main shell ─────────────────────────────────────────── */}
      <div className={`register-shell${isPhone ? ' is-phone' : ''}`}>

        {/* LEFT — cart side */}
        <section className={`cart-side${isPhone ? ' is-phone' : ''}`}>
          <ScanZone
            active={scanActive}
            hint="Scan or tap an item"
            subHint={isPhone ? 'Departments → bottom drawer' : 'Barcode · NFC · or pick from departments →'}
            onCode={handleScan}
          />

          <CartList compact={isPhone} />

          {/* Summary + Charge (tablet+ goes here; phone uses sticky bar below) */}
          {!isPhone && (
            <div className="cart-summary">
              <div className="summary-row">
                <span className="label">Subtotal</span>
                <span className="val">{formatIQDShort(subtotal)} IQD</span>
              </div>
              <div className="summary-row">
                <span className="label">Discounts</span>
                <span className="val discount">− 0 IQD</span>
              </div>
              <div className="summary-row summary-total">
                <span className="label">Total due</span>
                <span className="val">{formatIQDShort(subtotal)} IQD</span>
              </div>
              <button
                type="button"
                className="charge-btn"
                onClick={() => setPayOpen(true)}
                disabled={lines.length === 0}
                aria-label={`Charge ${formatIQD(subtotal)} IQD`}
              >
                <span>Charge {itemCount > 0 ? `· ${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : ''}</span>
                <span className="amount">{chargeLabel}</span>
              </button>
            </div>
          )}
        </section>

        {/* RIGHT — quick-actions side (tablet+ only) */}
        {!isPhone && (
          <aside className="actions-side">
            <div className="actions-tabs">
              <button
                type="button"
                className={`actions-tab${activeTab === 'departments' ? ' active' : ''}`}
                onClick={() => setActiveTab('departments')}
              >
                Departments
              </button>
              <button
                type="button"
                className={`actions-tab${activeTab === 'favorites' ? ' active' : ''}`}
                onClick={() => setActiveTab('favorites')}
              >
                Favorites
              </button>
              <button
                type="button"
                className={`actions-tab${activeTab === 'orders' ? ' active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                Orders
              </button>
            </div>

            <div className="dept-rail-mini">
              {DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`dept-chip${activeDept === d ? ' active' : ''}`}
                  onClick={() => setActiveDept(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="tile-grid">
              {QUICK_TILES.map((t) => (
                <button key={t.name} type="button" className="tile">
                  <div className="tile-icon" aria-hidden="true">{t.icon}</div>
                  <div className="tile-name">{t.name}</div>
                  <div className="tile-meta">{t.meta}</div>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Phone sticky charge bar */}
      {isPhone && (
        <button
          type="button"
          className="charge-bar-sticky"
          onClick={() => setPayOpen(true)}
          disabled={lines.length === 0}
          aria-label={`Charge ${formatIQD(subtotal)} IQD`}
        >
          <span>Charge</span>
          <span className="amount">{chargeLabel}</span>
        </button>
      )}

      {/* Tablet+ status bar */}
      {!isPhone && (
        <footer className="register-statusbar">
          <div className="item"><span className="status-dot dot-ok" /> Printer · Epson TM-m30</div>
          <div className="item"><span className="status-dot dot-ok" /> Scanner · paired</div>
          <div className="item"><span className="status-dot dot-off" /> Drawer · not paired</div>
          <div className="right">
            <div className="item">Sync queue · <span className="sync-count">0</span> pending</div>
            <div className="item">Terminal · POS-01</div>
            <div className="item">v2.4.1</div>
          </div>
        </footer>
      )}
    </div>
  );
}
