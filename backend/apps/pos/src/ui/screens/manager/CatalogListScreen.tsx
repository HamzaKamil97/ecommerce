import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db, type CatalogRow } from '../../../db/dexie';
import { syncCatalog } from '../../../db/catalog-sync';
import { VENDOR_ID } from '../../../env';

export function CatalogListScreen() {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');

  async function reload() { setRows(await db.catalog.toArray()); }
  useEffect(() => { reload(); }, []);

  async function refresh() {
    setBusy(true);
    try { await syncCatalog(VENDOR_ID); await reload(); } finally { setBusy(false); }
  }

  const filtered = filter
    ? rows.filter((r) => r.name.toLowerCase().includes(filter.toLowerCase()))
    : rows;

  return (
    <div>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>Catalog ({rows.length})</h1>
        <input placeholder="Search…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button onClick={refresh} disabled={busy}>Refresh</button>
        <Link to="/manager/catalog/new"><button>+ Add product</button></Link>
        <Link to="/manager/import"><button>CSV Import</button></Link>
      </header>
      <table style={{ width: '100%', marginTop: 16 }}>
        <thead><tr><th align="left">Name</th><th>SKU</th><th>Barcode</th><th>Price</th><th>On hand</th></tr></thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.variant_id}>
              <td>{r.name}</td><td>{r.sku ?? '—'}</td><td>{r.barcode ?? '—'}</td>
              <td align="right">{(r.price_minor / 1000).toFixed(2)}k</td>
              <td align="right">{r.on_hand}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
