import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProducts, listDepartments } from '../../../api/catalog';
import type { Product, Department } from '../../../api/catalog';
import { BulkToolbar } from '../../components/BulkToolbar';
import { Spotlight } from '../../components/Spotlight';
import type { SpotlightGroup } from '../../components/Spotlight';
import { useSpotlight } from '../../../state/spotlight';
import { useResponsive } from '../../../hooks/useResponsive';
import { VENDOR_ID } from '../../../env';
import './CatalogListScreen.css';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatPrice(minor: number): string {
  return minor.toLocaleString();
}

function stockClass(qty?: number): 'ok' | 'low' | 'oos' {
  if (qty === undefined || qty === 0) return 'oos';
  if (qty <= 5) return 'low';
  return 'ok';
}

function StockBadge({ qty }: { qty?: number }) {
  const cls = stockClass(qty);
  if (cls === 'oos') return <span className="stock-badge oos">OOS</span>;
  if (cls === 'low') return <span className="stock-badge low">Low · {qty}</span>;
  return <span className="stock-badge ok">{qty}</span>;
}

// ─── main component ─────────────────────────────────────────────────────────

export function CatalogListScreen() {
  const navigate = useNavigate();
  const { isPhone } = useResponsive();

  const vendorId = VENDOR_ID;
  const tenantId = VENDOR_ID;

  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);

  const { open: spotOpen, query, setQuery, openSpotlight, closeSpotlight } = useSpotlight();

  // Load data
  useEffect(() => {
    setLoading(true);
    Promise.all([listDepartments(tenantId), listProducts(vendorId)])
      .then(([depts, prods]) => {
        const sorted = [...depts].sort((a, b) => a.position - b.position);
        setDepartments(sorted);
        setProducts(prods);
        if (sorted.length > 0) setActiveDeptId(sorted[0]!.id);
      })
      .finally(() => setLoading(false));
  }, [vendorId, tenantId]);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSpotlight();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openSpotlight]);

  // Group products by department
  const productsByDept = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const dept of departments) map.set(dept.id, []);
    // Uncategorized bucket
    const uncatId = '__uncat__';
    for (const p of products) {
      const key = p.merch_category_id ?? uncatId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [products, departments]);

  // Spotlight results
  const spotResults = useMemo((): SpotlightGroup[] => {
    const q = query.trim().toLowerCase();
    const productItems = (
      q
        ? products.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              (p.sku ?? '').toLowerCase().includes(q),
          )
        : products.slice(0, 8)
    ).map((p) => ({
      id: p.id,
      label: p.title,
      meta: p.sku ?? undefined,
      iconChar: p.thumb_emoji ?? '📦',
    }));

    const actionsGroup: SpotlightGroup = {
      group: 'Actions',
      items: [
        {
          id: '__create__',
          label: q ? `Create new product "${q}…"` : 'Create new product',
          meta: 'Opens the AddProduct wizard',
          iconChar: '＋',
        },
      ],
    };

    const groups: SpotlightGroup[] = [];
    if (productItems.length > 0) groups.push({ group: 'Products', items: productItems });
    groups.push(actionsGroup);
    return groups;
  }, [query, products]);

  // Selection helpers
  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Scroll to dept section
  function scrollToDept(deptId: string) {
    setActiveDeptId(deptId);
    const el = document.getElementById(`dept-${deptId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Spotlight select handler
  function handleSpotlightSelect(item: { id: string }) {
    closeSpotlight();
    if (item.id === '__create__') {
      navigate('/manager/catalog/new');
    } else {
      navigate(`/manager/catalog/${item.id}`);
    }
  }

  const bulkActions = [
    { id: 'price', label: '💰 Change price', onClick: () => alert('Change price') },
    { id: 'dept', label: '📦 Move dept', onClick: () => alert('Move dept') },
    { id: 'tags', label: '🏷 Add tags', onClick: () => alert('Add tags') },
    { id: 'stock', label: '📊 Adjust stock', onClick: () => alert('Adjust stock') },
    { id: 'delete', label: '🗑 Delete', onClick: () => alert('Delete'), danger: true },
  ];

  return (
    <div className="catalog-list-screen">
      {/* Bulk toolbar — shown when 1+ items selected */}
      {selectedIds.size >= 1 && (
        <BulkToolbar
          variant="dark"
          count={selectedIds.size}
          actions={bulkActions}
          onClose={clearSelection}
        />
      )}

      {/* Header */}
      <div className="catalog-list-screen__header">
        <div className="catalog-list-screen__header-left">
          <h1 className="catalog-list-screen__title">Catalog</h1>
          <span className="catalog-list-screen__subtitle">Manager mode</span>
        </div>
        <div className="catalog-list-screen__header-actions">
          <button
            type="button"
            className="catalog-list-screen__search-box"
            onClick={openSpotlight}
            aria-label="Open spotlight search"
          >
            <span>🔍</span>
            <span className="catalog-list-screen__search-placeholder">
              Search products, departments…
            </span>
            <span className="catalog-list-screen__kbd">⌘ K</span>
          </button>
          <button
            type="button"
            className="catalog-list-screen__btn catalog-list-screen__btn--primary"
            onClick={() => navigate('/manager/catalog/new')}
          >
            ＋ Add product
          </button>
        </div>
      </div>

      {/* Phone chip rail */}
      {isPhone && (
        <div className="catalog-list-screen .chip-rail" role="tablist" aria-label="Departments">
          {departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              role="tab"
              aria-selected={activeDeptId === dept.id}
              className={`catalog-list-screen__chip${activeDeptId === dept.id ? ' active' : ''}`}
              onClick={() => scrollToDept(dept.id)}
            >
              {dept.name}
              {dept.product_count !== undefined && (
                <span className="catalog-list-screen__chip-count">{dept.product_count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="catalog-list-screen__body">
        {/* Desktop sticky department rail */}
        {!isPhone && (
          <aside className="catalog-list-screen__rail" aria-label="Department rail">
            {departments.map((dept) => (
              <button
                key={dept.id}
                type="button"
                className={`catalog-list-screen__rail-item${activeDeptId === dept.id ? ' active' : ''}`}
                onClick={() => scrollToDept(dept.id)}
              >
                <span className="catalog-list-screen__rail-name">{dept.name}</span>
                {dept.product_count !== undefined && (
                  <span className="catalog-list-screen__rail-count">{dept.product_count}</span>
                )}
              </button>
            ))}
          </aside>
        )}

        {/* Main product list */}
        <main className="catalog-list-screen__main">
          {loading ? (
            <div className="catalog-list-screen__loading">Loading catalog…</div>
          ) : (
            departments.map((dept) => {
              const deptProducts = productsByDept.get(dept.id) ?? [];
              return (
                <section
                  key={dept.id}
                  id={`dept-${dept.id}`}
                  className="catalog-list-screen__dept-section"
                >
                  <div className="catalog-list-screen__dept-header">
                    <div className="catalog-list-screen__dept-ic">
                      {dept.icon_url ?? '📦'}
                    </div>
                    <div>
                      <h2 className="catalog-list-screen__dept-name">{dept.name}</h2>
                      <span className="catalog-list-screen__dept-meta">
                        {deptProducts.length} products
                      </span>
                    </div>
                    <div className="catalog-list-screen__dept-actions">
                      <button
                        type="button"
                        className="catalog-list-screen__btn"
                        onClick={() => navigate('/manager/catalog/new')}
                      >
                        ＋ Add to {dept.name}
                      </button>
                    </div>
                  </div>

                  <div className="product-grid">
                    {deptProducts.map((product) => {
                      const isSelected = selectedIds.has(product.id);
                      return (
                        <div
                          key={product.id}
                          className={`product-card${isSelected ? ' selected' : ''}`}
                          onClick={() => navigate(`/manager/catalog/${product.id}`)}
                        >
                          {/* Select checkbox */}
                          <label
                            className="product-card__check-label"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${product.title}`}
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(product.id)) next.delete(product.id);
                                  else next.add(product.id);
                                  return next;
                                });
                              }}
                            />
                          </label>

                          {/* Thumbnail */}
                          <div className="thumb" aria-hidden>
                            {product.thumb_emoji ?? '📦'}
                          </div>

                          {/* Info */}
                          <div className="info">
                            <div className="name">{product.title}</div>
                            <div className="meta-row">
                              {product.sku && (
                                <span className="mono">SKU {product.sku}</span>
                              )}
                              {product.barcode && (
                                <>
                                  <span>·</span>
                                  <span className="mono">{product.barcode}</span>
                                </>
                              )}
                            </div>
                            <div className="bottom">
                              <span className="price">
                                {formatPrice(product.price_minor)}
                                <small>{product.currency_code}</small>
                              </span>
                              <StockBadge qty={product.stock_qty} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </main>
      </div>

      {/* Spotlight overlay */}
      <Spotlight
        open={spotOpen}
        query={query}
        onQueryChange={setQuery}
        onClose={closeSpotlight}
        onSelect={handleSpotlightSelect}
        results={spotResults}
      />
    </div>
  );
}
