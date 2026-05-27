import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { useTheme, Theme } from '../../state/theme';
import { useSession } from '../../state/session';
import { Config, defaultConfig, loadConfig, saveConfig } from '../../state/config';
import { pairPrinter, isPaired } from '../../hardware/printer-webserial';
import './SettingsScreen.css';

type OpsToggles = {
  confirmOnCharge: boolean;
  soundOnScan: boolean;
  printTwoReceipts: boolean;
};

const OPS_STORAGE_KEY = 'pos:settings:ops';
const LARGER_TEXT_KEY = 'pos:settings:largerText';

const defaultOps: OpsToggles = {
  confirmOnCharge: true,
  soundOnScan: true,
  printTwoReceipts: false,
};

function loadOps(): OpsToggles {
  if (typeof localStorage === 'undefined') return defaultOps;
  try {
    const raw = localStorage.getItem(OPS_STORAGE_KEY);
    if (!raw) return defaultOps;
    return { ...defaultOps, ...(JSON.parse(raw) as Partial<OpsToggles>) };
  } catch {
    return defaultOps;
  }
}

function persistOps(ops: OpsToggles): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(OPS_STORAGE_KEY, JSON.stringify(ops));
  } catch {
    /* ignore quota / private-mode failures */
  }
}

function loadLargerText(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(LARGER_TEXT_KEY) === '1';
  } catch {
    return false;
  }
}

function persistLargerText(on: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LARGER_TEXT_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

type SectionId = 'appearance' | 'hardware' | 'operations' | 'quick';

const NAV: { id: SectionId; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'hardware', label: 'Hardware', icon: '🖨' },
  { id: 'operations', label: 'Operations', icon: '⚙' },
  { id: 'quick', label: 'Quick-buttons', icon: '⚡' },
];

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const theme = useTheme((s) => s.theme);
  const autoMode = useTheme((s) => s.autoMode);
  const setTheme = useTheme((s) => s.setTheme);
  const setAutoMode = useTheme((s) => s.setAutoMode);

  const cashier = useSession((s) => s.cashier_name) ?? 'Cashier';

  const [cfg, setCfg] = useState<Config>(defaultConfig);
  const [ops, setOps] = useState<OpsToggles>(() => loadOps());
  const [largerText, setLargerText] = useState<boolean>(() => loadLargerText());
  const [active, setActive] = useState<SectionId>('appearance');
  const [printerReady, setPrinterReady] = useState<boolean>(false);
  const [pairError, setPairError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig().then(setCfg).catch(() => {
      /* dev: db.config may not exist yet — keep defaults */
    });
    setPrinterReady(isPaired());
  }, []);

  function pickTheme(next: Theme): void {
    setTheme(next);
    // persist to existing config too so app cold-start keeps the choice
    const updated: Config = { ...cfg, theme: next };
    setCfg(updated);
    saveConfig(updated).catch(() => {
      /* ignore — theme store is source of truth at runtime */
    });
  }

  function toggleAutoDark(): void {
    setAutoMode(!autoMode);
  }

  function toggleLargerText(): void {
    const next = !largerText;
    setLargerText(next);
    persistLargerText(next);
    // TODO: bind to a global "larger-text" class on <html> once design tokens
    // for the scaled font scale ship.
  }

  function setOp<K extends keyof OpsToggles>(k: K, v: OpsToggles[K]): void {
    const next = { ...ops, [k]: v };
    setOps(next);
    persistOps(next);
  }

  async function onPairPrinter(): Promise<void> {
    setPairError(null);
    try {
      await pairPrinter();
      setPrinterReady(true);
    } catch (e) {
      setPairError(e instanceof Error ? e.message : String(e));
    }
  }

  function onManageQuickButtons(): void {
    // C3 stub — Manager-PIN-gated quick-button reorder ships in a later task.
    // eslint-disable-next-line no-console
    console.log('would route to /manager/quick-buttons');
  }

  return (
    <div className="settings-screen" data-theme={theme}>
      <header className="settings-header">
        <button
          type="button"
          className="back-btn"
          aria-label="back"
          onClick={onClose}
        >
          ←
        </button>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Cashier · {cashier} · POS-01</p>
        </div>
        <div className="h-spacer" />
        <span className="version-label">v2.4.1</span>
      </header>

      <div className="settings-layout">
        <nav className="sec-nav" aria-label="settings sections">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`sec-nav-link ${active === n.id ? 'active' : ''}`}
              onClick={() => {
                setActive(n.id);
                const el = document.getElementById(`section-${n.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span aria-hidden="true">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="sec-content">
          {/* Appearance */}
          <Card className="settings-section" id="section-appearance">
            <h2>Appearance</h2>
            <p className="section-desc">
              Choose how your register looks during a shift. Most counters use dark to reduce glare; auto-dark switches at sundown.
            </p>

            <div className="swatches">
              <button
                type="button"
                className={`swatch ${theme === 'dark' ? 'selected' : ''}`}
                aria-pressed={theme === 'dark'}
                onClick={() => pickTheme('dark')}
              >
                <div className="swatch-preview dark">
                  <div className="bar" />
                  <div className="body" />
                </div>
                <div className="swatch-meta">
                  <span className="swatch-name">Dark</span>
                  {theme === 'dark' ? (
                    <span className="swatch-tag">✓ Active</span>
                  ) : (
                    <span className="swatch-hint">Counter-friendly</span>
                  )}
                </div>
              </button>

              <button
                type="button"
                className={`swatch ${theme === 'light' ? 'selected' : ''}`}
                aria-pressed={theme === 'light'}
                onClick={() => pickTheme('light')}
              >
                <div className="swatch-preview light">
                  <div className="bar" />
                  <div className="body" />
                </div>
                <div className="swatch-meta">
                  <span className="swatch-name">Light</span>
                  {theme === 'light' ? (
                    <span className="swatch-tag">✓ Active</span>
                  ) : (
                    <span className="swatch-hint">Default</span>
                  )}
                </div>
              </button>
            </div>

            <div className="toggle-row">
              <div className="toggle-text">
                <div className="title">Auto-dark at sundown</div>
                <div className="sub">
                  Switch to dark at <span className="mono">18:00</span> · back to light at <span className="mono">06:00</span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoMode}
                aria-label="Auto-dark at sundown"
                className={`toggle ${autoMode ? 'on' : ''}`}
                onClick={toggleAutoDark}
              />
            </div>

            <div className="toggle-row">
              <div className="toggle-text">
                <div className="title">Larger text</div>
                <div className="sub">Body 14px · helpful in dim aisles</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={largerText}
                aria-label="Larger text"
                className={`toggle ${largerText ? 'on' : ''}`}
                onClick={toggleLargerText}
              />
            </div>
          </Card>

          {/* Hardware */}
          <Card className="settings-section" id="section-hardware">
            <h2>Hardware</h2>
            <p className="section-desc">
              Devices paired to this terminal. Green-pulse = ready right now.
            </p>

            <div className="chips-grid">
              <Card className="hw-chip">
                <div className="hw-icon" aria-hidden="true">🖨</div>
                <div className="hw-info">
                  <div className="hw-name">Receipt printer</div>
                  <div className="hw-model">
                    {printerReady ? 'Epson TM-m30 · USB' : 'No device paired'}
                  </div>
                </div>
                {printerReady ? (
                  <span className="hw-status status-ready">
                    <span className="dot green" /> Ready
                  </span>
                ) : (
                  <button type="button" className="pair-btn" onClick={onPairPrinter}>
                    + Pair
                  </button>
                )}
              </Card>

              <Card className="hw-chip">
                <div className="hw-icon" aria-hidden="true">📷</div>
                <div className="hw-info">
                  <div className="hw-name">Barcode scanner</div>
                  <div className="hw-model">Honeywell 1900 · HID</div>
                </div>
                <span className="hw-status status-ready">
                  <span className="dot green" /> Ready
                </span>
              </Card>

              <Card className="hw-chip">
                <div className="hw-icon" aria-hidden="true">💰</div>
                <div className="hw-info">
                  <div className="hw-name">Cash drawer</div>
                  <div className="hw-model">No device paired</div>
                </div>
                <button
                  type="button"
                  className="pair-btn"
                  onClick={onPairPrinter}
                  aria-label="Pair cash drawer"
                >
                  + Pair
                </button>
              </Card>

              <Card className="hw-chip">
                <div className="hw-icon" aria-hidden="true">📺</div>
                <div className="hw-info">
                  <div className="hw-name">Customer display</div>
                  <div className="hw-model">No device paired</div>
                </div>
                <button
                  type="button"
                  className="pair-btn"
                  aria-label="Pair customer display"
                  onClick={() => {
                    /* customer-display pairing ships in a later task */
                  }}
                >
                  + Pair
                </button>
              </Card>
            </div>

            {pairError && (
              <div className="pair-error" role="alert">
                Pair failed: {pairError}
              </div>
            )}
          </Card>

          {/* Operations */}
          <Card className="settings-section" id="section-operations">
            <h2>Operations</h2>
            <p className="section-desc">
              Behaviors during a sale. Defaults match Loyverse to keep muscle memory.
            </p>

            <div className="toggle-row">
              <div className="toggle-text">
                <div className="title">Confirm on Charge</div>
                <div className="sub">Ask "Confirm?" before opening the payment screen</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={ops.confirmOnCharge}
                aria-label="Confirm on Charge"
                className={`toggle emerald-on ${ops.confirmOnCharge ? 'on' : ''}`}
                onClick={() => setOp('confirmOnCharge', !ops.confirmOnCharge)}
              />
            </div>

            <div className="toggle-row">
              <div className="toggle-text">
                <div className="title">Sound on scan</div>
                <div className="sub">Beep when barcode read · helps in loud aisles</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={ops.soundOnScan}
                aria-label="Sound on scan"
                className={`toggle emerald-on ${ops.soundOnScan ? 'on' : ''}`}
                onClick={() => setOp('soundOnScan', !ops.soundOnScan)}
              />
            </div>

            <div className="toggle-row">
              <div className="toggle-text">
                <div className="title">Print 2 receipts by default</div>
                <div className="sub">
                  One for customer, one for shop file. Override per-sale on the print prompt.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={ops.printTwoReceipts}
                aria-label="Print 2 receipts by default"
                className={`toggle ${ops.printTwoReceipts ? 'on' : ''}`}
                onClick={() => setOp('printTwoReceipts', !ops.printTwoReceipts)}
              />
            </div>
          </Card>

          {/* Quick-buttons CTA */}
          <Card className="settings-section" id="section-quick">
            <h2>Quick-buttons</h2>
            <p className="section-desc">
              Right-pane quick-tile grid on the register. Manager-only.
            </p>

            <button
              type="button"
              className="manage-cta"
              onClick={onManageQuickButtons}
            >
              <span className="cta-icon" aria-hidden="true">⚡</span>
              <span className="cta-text">
                <span className="title">Drag-reorder quick-buttons</span>
                <span className="sub">
                  Add favorites · move tiles · {cfg.quick_buttons.length} active
                </span>
              </span>
              <span className="cta-lock">🔒 Manager PIN</span>
              <span className="cta-arrow" aria-hidden="true">→</span>
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
