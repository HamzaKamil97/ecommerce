import { useEffect, useMemo, useState } from 'react';
import type { CatalogRow } from '../../../db/dexie';
import { syncCatalog, loadCatalogFromDb } from '../../../db/catalog-sync';
import './CatalogBrowser.css';

function formatIQD(minor: number): string {
  return `${minor.toLocaleString('en-US')} IQD`;
}

export function CatalogBrowser({
  vendorId,
  onPick,
}: {
  vendorId: string;
  onPick: (row: CatalogRow) => void;
}) {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState<string>('All');

  useEffect(() => {
    let alive = true;
    (async () => {
      // Offline-first: show cached instantly, then refresh in the background.
      const cached = await loadCatalogFromDb();
      if (alive && cached.length) { setRows(cached); setLoading(false); }
      try { await syncCatalog(vendorId); } catch { /* offline — keep cache */ }
      const fresh = await loadCatalogFromDb();
      if (alive) { setRows(fresh); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [vendorId]);

  const departments = useMemo(() => {
    const names = new Set<string>();
    for (const r of rows) if (r.category_name) names.add(r.category_name);
    return ['All', ...[...names].sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (dept !== 'All' && r.category_name !== dept) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.sku ?? '').toLowerCase().includes(q) ||
        (r.barcode ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, dept]);

  return (
    <aside className="catalog-browser">
      <div className="cb-search">
        <input
          type="text"
          placeholder="Search products or scan…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
        />
        {query && <button type="button" className="cb-clear" aria-label="Clear search" onClick={() => setQuery('')}>✕</button>}
      </div>

      <div className="cb-dept-rail">
        {departments.map((d) => (
          <button
            key={d}
            type="button"
            className={`cb-chip${dept === d ? ' active' : ''}`}
            onClick={() => setDept(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cb-grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="cb-skel" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="cb-state">
          <div className="cb-state-emoji" aria-hidden="true">🗂️</div>
          <div className="cb-state-title">No products yet</div>
          <div className="cb-state-desc">Items added in Manager → Catalog appear here. You can still scan a barcode to ring up.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="cb-state">
          <div className="cb-state-emoji" aria-hidden="true">🔍</div>
          <div className="cb-state-title">No matches</div>
          <div className="cb-state-desc">Nothing matches "{query}"{dept !== 'All' ? ` in ${dept}` : ''}.</div>
        </div>
      ) : (
        <>
          <div className="cb-meta">{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</div>
          <div className="cb-grid">
            {filtered.map((r) => {
              const oos = r.on_hand <= 0;
              return (
                <button
                  key={r.variant_id}
                  type="button"
                  className={`cb-tile${oos ? ' oos' : ''}`}
                  onClick={() => onPick(r)}
                  disabled={oos}
                >
                  <div className="cb-tile-icon" aria-hidden="true">
                    {r.image_url ? <img src={r.image_url} alt="" /> : (r.thumb_emoji ?? '📦')}
                  </div>
                  <div className="cb-tile-name">{r.name}</div>
                  <div className="cb-tile-price">{formatIQD(r.price_minor)}</div>
                  <div className="cb-tile-stock">{oos ? 'Out of stock' : `${r.on_hand} in stock`}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}
