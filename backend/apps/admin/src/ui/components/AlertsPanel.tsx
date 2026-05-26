import { useEffect, useState } from 'react';
import { fetchDriftAlerts, fetchLowStock, type DriftItem, type LowStockItem } from '../../api/reports';
import { useAdminSession } from '../../state/session';

export function AlertsPanel() {
  const vendor = useAdminSession((s) => s.vendor_id);
  const [drift, setDrift] = useState<DriftItem[]>([]);
  const [low, setLow] = useState<LowStockItem[]>([]);

  useEffect(() => {
    fetchDriftAlerts(vendor).then((r) => setDrift(r.flagged)).catch(() => setDrift([]));
    fetchLowStock(vendor, 5).then((r) => setLow(r.items)).catch(() => setLow([]));
  }, [vendor]);

  return (
    <section style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius)' }}>
      <h2>Alerts</h2>
      <h3>Drift ({drift.length})</h3>
      <ul>{drift.slice(0, 5).map((d) => (
        <li key={d.variant_id}>{d.variant_id}: {d.flag} (on_hand={d.on_hand}, reserved={d.reserved})</li>
      ))}</ul>
      <h3>Low stock ({low.length})</h3>
      <ul>{low.slice(0, 10).map((l) => (
        <li key={l.variant_id}>{l.variant_id}: available={l.available}</li>
      ))}</ul>
    </section>
  );
}
