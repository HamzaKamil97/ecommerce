import { useCart } from '../../state/cart';

export function CartList() {
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.removeLine);
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {lines.length === 0 && <li style={{ color: 'var(--muted)', padding: 12 }}>Scan to start</li>}
      {lines.map((l) => (
        <li key={l.variant_id} style={{ display: 'flex', alignItems: 'center', padding: 8, borderBottom: '1px solid #222' }}>
          <span style={{ flex: 1 }}>{l.name}</span>
          <button aria-label="decrease" onClick={() => setQty(l.variant_id, l.qty - 1)}>−</button>
          <span style={{ minWidth: 32, textAlign: 'center' }}>{l.qty}</span>
          <button aria-label="increase" onClick={() => setQty(l.variant_id, l.qty + 1)}>+</button>
          <span style={{ minWidth: 80, textAlign: 'right' }}>{(l.qty * l.unit_price_minor / 1000).toFixed(0)}k</span>
          <button aria-label="remove" onClick={() => remove(l.variant_id)} style={{ marginLeft: 8 }}>×</button>
        </li>
      ))}
    </ul>
  );
}
