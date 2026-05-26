import { useEffect, useState } from 'react';
import { fetchTopSkus, type TopSku } from '../../api/reports';
import { useAdminSession } from '../../state/session';

export function TopSkusTable() {
  const vendor = useAdminSession((s) => s.vendor_id);
  const [items, setItems] = useState<TopSku[]>([]);

  useEffect(() => {
    fetchTopSkus(vendor, 20).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [vendor]);

  return (
    <section style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius)' }}>
      <h2>Top SKUs</h2>
      <table style={{ width: '100%' }}>
        <thead><tr><th align="left">Item</th><th align="right">Units</th><th align="right">Revenue</th></tr></thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.variant_id}>
              <td>{t.name_snapshot}</td>
              <td align="right">{t.units_sold}</td>
              <td align="right">{(t.revenue_minor / 1000).toFixed(2)}k</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
