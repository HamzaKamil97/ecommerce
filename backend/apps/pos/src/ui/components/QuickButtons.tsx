import { useEffect, useState } from 'react';
import { useCart } from '../../state/cart';
import { loadConfig, QuickButton } from '../../state/config';
import { db } from '../../db/dexie';

export function QuickButtons() {
  const [btns, setBtns] = useState<QuickButton[]>([]);

  useEffect(() => {
    loadConfig().then((c) => setBtns(c.quick_buttons));
  }, []);

  async function press(b: QuickButton) {
    const item = await db.catalog.get(b.variant_id);
    if (!item) return;
    useCart.getState().addLineFromScan({
      variant_id: item.variant_id,
      name: item.name,
      unit_price_minor: item.price_minor,
      qty: 1,
    });
  }

  if (btns.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, padding: 8 }}>
      {btns.map((b) => (
        <button key={b.variant_id} onClick={() => press(b)}
          style={{ padding: 16, background: b.color, color: '#000', border: 'none',
                   borderRadius: 'var(--radius)', fontSize: 16 }}>{b.label}</button>
      ))}
    </div>
  );
}
