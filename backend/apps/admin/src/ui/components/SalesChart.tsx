import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchSalesSummary, type SalesBucket } from '../../api/reports';
import { useAdminSession } from '../../state/session';

export function SalesChart() {
  const vendor = useAdminSession((s) => s.vendor_id);
  const [data, setData] = useState<SalesBucket[]>([]);
  const [from, setFrom] = useState<string>(() => new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetchSalesSummary(vendor, new Date(from), new Date(to), 'day')
      .then((r) => setData(r.buckets)).catch(() => setData([]));
  }, [vendor, from, to]);

  return (
    <section style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ flex: 1 }}>Sales</h2>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </header>
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data.map((b) => ({ ...b, revenue_k: b.revenue_minor / 1000 }))}>
            <XAxis dataKey="bucket_at" tickFormatter={(v) => String(v).slice(5, 10)} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue_k" stroke="var(--accent)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
