import { useEffect, useState } from 'react';
import { useCart } from '../../state/cart';
import { CartList } from '../components/CartList';
import { StatusBar } from '../components/StatusBar';
import { findByBarcode } from '../../db/catalog-sync';
import { startBarcodeListener } from '../../hardware/barcode';

export function RegisterScreen() {
  const [error, setError] = useState<string | null>(null);
  const subtotal = useCart((s) => s.subtotalMinor());

  useEffect(() => {
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
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', height: '100vh' }}>
      <StatusBar online={navigator.onLine} queueDepth={0} />
      <section style={{ overflow: 'auto' }}>
        {error && <p style={{ color: 'var(--danger)', padding: 8 }}>{error}</p>}
        <CartList />
      </section>
      <footer style={{ padding: 16, background: '#111', borderTop: '1px solid #222',
        display: 'flex', alignItems: 'center', gap: 16 }}>
        <strong style={{ fontSize: 28, flex: 1 }}>{(subtotal / 1000).toFixed(0)}k IQD</strong>
        <button style={{ padding: '12px 24px', fontSize: 20, background: 'var(--accent)',
          color: '#000', border: 'none', borderRadius: 'var(--radius)' }}>Charge</button>
      </footer>
    </div>
  );
}
