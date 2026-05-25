import { useEffect, useState } from 'react';
import { useCart } from '../../state/cart';
import { CartList } from '../components/CartList';
import { StatusBar } from '../components/StatusBar';
import { findByBarcode } from '../../db/catalog-sync';
import { startBarcodeListener } from '../../hardware/barcode';
import { PaymentScreen } from './PaymentScreen';
import { SettingsScreen } from './SettingsScreen';
import { QuickButtons } from '../components/QuickButtons';

export function RegisterScreen() {
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const subtotal = useCart((s) => s.subtotalMinor());
  const lines = useCart((s) => s.lines);

  useEffect(() => {
    if (payOpen || settingsOpen) return;
    const stop = startBarcodeListener({
      onScan: async (code) => {
        setError(null);
        const item = await findByBarcode(code);
        if (!item) {
          setError(`Unknown barcode: ${code}`);
          new Audio('/error.wav').play().catch(() => {});
          return;
        }
        useCart.getState().addLineFromScan({
          variant_id: item.variant_id,
          name: item.name,
          unit_price_minor: item.price_minor,
          qty: 1,
        });
        new Audio('/beep.wav').play().catch(() => {});
      },
    });
    return stop;
  }, [payOpen, settingsOpen]);

  if (payOpen) return <PaymentScreen onClose={() => setPayOpen(false)} />;
  if (settingsOpen) return <SettingsScreen onClose={() => setSettingsOpen(false)} />;

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', height: '100vh' }}>
      <StatusBar />
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 4 }}>
        <button onClick={() => setSettingsOpen(true)} aria-label="settings">⚙</button>
      </div>
      <section style={{ overflow: 'auto' }}>
        {error && <p style={{ color: 'var(--danger)', padding: 8 }}>{error}</p>}
        <QuickButtons />
        <CartList />
      </section>
      <footer style={{ padding: 16, background: '#111', borderTop: '1px solid #222',
        display: 'flex', alignItems: 'center', gap: 16 }}>
        <strong style={{ fontSize: 28, flex: 1 }}>{(subtotal / 1000).toFixed(0)}k IQD</strong>
        <button onClick={() => setPayOpen(true)} disabled={lines.length === 0}
          style={{ padding: '12px 24px', fontSize: 20, background: 'var(--accent)',
                   color: '#000', border: 'none', borderRadius: 'var(--radius)' }}>Charge</button>
      </footer>
    </div>
  );
}
