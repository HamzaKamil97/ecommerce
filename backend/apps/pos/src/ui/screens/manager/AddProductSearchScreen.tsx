import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProducts } from '../../../api/catalog';
import type { Product } from '../../../api/catalog';
import { searchOpenFoodFacts } from '../../../api/openFoodFacts';
import type { OffHit } from '../../../api/openFoodFacts';
import { VENDOR_ID } from '../../../env';
import './AddProductSearchScreen.css';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatPrice(minor: number): string {
  return minor.toLocaleString();
}

function filterCatalog(products: Product[], q: string): Product[] {
  if (!q.trim()) return [];
  const lower = q.trim().toLowerCase();
  return products
    .filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        (p.sku ?? '').toLowerCase().includes(lower),
    )
    .slice(0, 8);
}

// ─── main component ─────────────────────────────────────────────────────────

export function AddProductSearchScreen() {
  const navigate = useNavigate();
  const vendorId = VENDOR_ID;

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [offHits, setOffHits] = useState<OffHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load full catalog on mount for dedup filtering
  useEffect(() => {
    listProducts(vendorId).then(setProducts).catch(console.error);
  }, [vendorId]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced OpenFoodFacts search (~250ms), cancel on cleanup
  useEffect(() => {
    if (!query || query.length < 2) {
      setOffHits([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(() => {
      searchOpenFoodFacts(query)
        .then((hits) => { if (!cancelled) setOffHits(hits); })
        .catch(() => { if (!cancelled) setOffHits([]); });
    }, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [query]);

  const catalogMatches = filterCatalog(products, query);
  const hasQuery = query.trim().length > 0;

  return (
    <div className="add-product-search">
      {/* Header */}
      <div className="add-product-search__header">
        <button
          type="button"
          className="add-product-search__back-btn"
          aria-label="Back"
          onClick={() => navigate('/manager/catalog')}
        >
          ‹
        </button>
        <div className="add-product-search__title-block">
          <h1 className="add-product-search__title">Add a product</h1>
          <div className="add-product-search__subtitle">
            Step 1 of 2 · Search first — we may already have it
          </div>
        </div>
      </div>

      {/* Wizard step indicator */}
      <div className="add-product-search__steps">
        <div className="add-product-search__step add-product-search__step--active">
          <div className="add-product-search__step-num">1</div>
          <div className="add-product-search__step-label">Find or create</div>
        </div>
        <div className="add-product-search__step-link" />
        <div className="add-product-search__step">
          <div className="add-product-search__step-num">2</div>
          <div className="add-product-search__step-label">Fill details</div>
        </div>
      </div>

      {/* Content shell */}
      <div className="add-product-search__shell">
        {/* Search bar */}
        <div className="add-product-search__search-bar">
          <div className="add-product-search__search-icon">🔍</div>
          <input
            ref={inputRef}
            className="add-product-search__search-input"
            type="text"
            autoFocus
            placeholder="Type product name or scan barcode…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="add-product-search__scan-btn"
            aria-label="Scan barcode"
            onClick={() => alert('Barcode scanner — coming soon')}
          >
            <span className="add-product-search__scan-ic">📷</span>
            <span>Scan barcode</span>
          </button>
        </div>

        <div className="add-product-search__search-hint">
          Type to search · <kbd>Tab</kbd> to scan · barcode lookup pre-fills from OpenFoodFacts
        </div>

        {/* Empty state — shown when no query */}
        {!hasQuery && (
          <div className="add-product-search__empty">
            <div className="add-product-search__empty-ill">🔎</div>
            <h3 className="add-product-search__empty-heading">
              Start typing or scan a barcode
            </h3>
            <p className="add-product-search__empty-copy">
              We'll search your existing catalog first to avoid duplicates, then look in
              OpenFoodFacts to pre-fill brand · category · nutrition · image.
            </p>
          </div>
        )}

        {/* In-catalog results */}
        {hasQuery && catalogMatches.length > 0 && (
          <section>
            <div className="add-product-search__section-header">
              <h3 className="add-product-search__section-title">In your catalog</h3>
              <span className="add-product-search__source-pill add-product-search__source-pill--in">
                ● Already exists
              </span>
              <span className="add-product-search__section-meta">
                {catalogMatches.length} match{catalogMatches.length !== 1 ? 'es' : ''}
              </span>
            </div>

            {catalogMatches.map((product) => (
              <div
                key={product.id}
                className="add-product-search__result"
                onClick={() => navigate(`/manager/catalog/${product.id}/edit`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    navigate(`/manager/catalog/${product.id}/edit`);
                }}
              >
                <div className="add-product-search__result-thumb">
                  {product.thumb_emoji ?? '📦'}
                </div>
                <div className="add-product-search__result-body">
                  <div className="add-product-search__result-name">{product.title}</div>
                  <div className="add-product-search__result-meta">
                    {product.sku && <span>SKU {product.sku}</span>}
                    {product.sku && <span> · </span>}
                    <span>
                      {formatPrice(product.price_minor)} {product.currency_code.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="add-product-search__pill add-product-search__pill--edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/manager/catalog/${product.id}/edit`);
                  }}
                >
                  ✎ Edit
                </button>
              </div>
            ))}
          </section>
        )}

        {/* OpenFoodFacts results — shown only when offHits is non-empty (stubbed empty for now) */}
        {hasQuery && offHits.length > 0 && (
          <section>
            <div className="add-product-search__section-header">
              <h3 className="add-product-search__section-title">From OpenFoodFacts</h3>
              <span className="add-product-search__source-pill add-product-search__source-pill--off">
                ⚡ Suggested
              </span>
              <span className="add-product-search__section-meta">
                {offHits.length} match{offHits.length !== 1 ? 'es' : ''} · prefilled fields shown
                when you tap Add
              </span>
            </div>

            {offHits.map((hit) => (
              <div
                key={hit.id}
                className="add-product-search__result"
                onClick={() =>
                  navigate(`/manager/catalog/new?off=${encodeURIComponent(hit.id)}`)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    navigate(`/manager/catalog/new?off=${encodeURIComponent(hit.id)}`);
                }}
              >
                <div className="add-product-search__result-thumb">
                  {hit.imageUrl ? (
                    <img src={hit.imageUrl} alt={hit.title} width={56} height={56} />
                  ) : (
                    '📦'
                  )}
                </div>
                <div className="add-product-search__result-body">
                  <div className="add-product-search__result-name">{hit.title}</div>
                  <div className="add-product-search__result-meta">
                    {hit.brand && <span>{hit.brand}</span>}
                    {hit.barcode && <span> · {hit.barcode}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="add-product-search__pill add-product-search__pill--add"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/manager/catalog/new?off=${encodeURIComponent(hit.id)}`);
                  }}
                >
                  ＋ Add
                </button>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="add-product-search__sticky-cta">
        <div className="add-product-search__cta-copy">
          <div className="add-product-search__cta-title">Don't see what you're looking for?</div>
          <div className="add-product-search__cta-sub">
            Create a brand-new product from scratch — title, price, category required.
          </div>
        </div>
        <button
          type="button"
          className="add-product-search__create-btn"
          onClick={() =>
            navigate(
              `/manager/catalog/new${query.trim() ? `?title=${encodeURIComponent(query.trim())}` : ''}`,
            )
          }
        >
          ＋ Create new from scratch
        </button>
      </div>
    </div>
  );
}
