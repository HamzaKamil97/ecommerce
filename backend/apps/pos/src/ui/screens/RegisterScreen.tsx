import { useState } from 'react';
import { useCart } from '../../state/cart';
import { CartList } from '../components/CartList';
import { StatusBar } from '../components/StatusBar';
import { findByBarcode } from '../../db/catalog-sync';

export function RegisterScreen() {
  const [scan, setScan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const subtotal = useCart((s) => s.subtotalMinor());
  const addLine = useCart((s) => s.addLineFromScan);

  async function onScan(code: string) {
    setError(null);
    const item = await findByBarcode(code);
    if (!item) { setError(`Unknown barcode: ${code}`); return; }
    addLine({ variant_id: item.variant_id, name: item.name, unit_price_minor: item.price_minor, qty: 1 });
  }

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', height: '100vh' }}>
      <StatusBar online={navigator.onLine} queueDepth={0} />
      <section style={{ overflow: 'auto' }}>
        <input
          value={scan}
          onChange={(e) => setScan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && scan.trim()) { onScan(scan.trim()); setScan(''); }
          }}
          placeholder="Scan or type barcode + Enter"
          autoFocus
          style={{ width: '100%', padding: 16, fontSize: 20, background: '#111', color: 'var(--fg)', border: 'none' }}
        />
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
