import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listDepartments, createProduct } from '../../../api/catalog';
import type { Department } from '../../../api/catalog';
import { VENDOR_ID } from '../../../env';
import './AddProductScreen.css';

// ─── helpers ────────────────────────────────────────────────────────────────

const CURRENCY = 'iqd';

function computeMargin(price: number, cost: number): string | null {
  if (!price || !cost || cost >= price) return null;
  const pct = Math.round(((price - cost) / price) * 1000) / 10;
  return `${pct}%`;
}

// ─── main component ─────────────────────────────────────────────────────────

export function AddProductScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const vendorId = VENDOR_ID;

  // Departments
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    listDepartments(vendorId)
      .then((depts) => {
        const sorted = [...depts].sort((a, b) => a.position - b.position);
        setDepartments(sorted);
        // Default to the first department only if nothing is selected yet.
        // Functional updater avoids a stale-closure read of `deptId`.
        if (sorted.length > 0) setDeptId((cur) => cur || sorted[0]!.id);
      })
      .catch(() => setDepartments([]));
  }, [vendorId]);

  // Required fields
  const [title, setTitle] = useState(() => searchParams.get('title') ?? '');
  const [price, setPrice] = useState('');
  const [deptId, setDeptId] = useState('');

  // More-details accordion
  const [moreOpen, setMoreOpen] = useState(false);

  // Optional fields (accordion)
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [supplier, setSupplier] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [initialOnHand, setInitialOnHand] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [tags, setTags] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Schema fields (vendor-configurable)
  const [bestBefore, setBestBefore] = useState('');
  const [packSize, setPackSize] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');

  // Save state
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Derived: margin
  const priceNum = parseFloat(price);
  const costNum = parseFloat(costPrice);
  const margin = computeMargin(priceNum, costNum);

  // Derived: selected department name
  const selectedDept = departments.find((d) => d.id === deptId);

  // Derived: ready state (title + a positive integer price). Uses parseInt to
  // stay consistent with the submit guard — otherwise "0.5" reads ready but fails save.
  const priceMinor = parseInt(price, 10);
  const isReady = title.trim().length > 0 && !isNaN(priceMinor) && priceMinor > 0;

  // Reset every field for the "Save & add another" flow. Department selection is
  // intentionally preserved so the next item lands in the same place.
  function resetForm() {
    setTitle('');
    setPrice('');
    setDescription('');
    setBrand('');
    setSupplier('');
    setCostPrice('');
    setLowStockThreshold('');
    setInitialOnHand('');
    setSku('');
    setBarcode('');
    setTags('');
    setInternalNotes('');
    setBestBefore('');
    setPackSize('');
    setCountryOfOrigin('');
    setMoreOpen(false);
  }

  async function submitProduct(resetAfter: boolean) {
    if (!title.trim()) { setErr('Title is required'); return; }
    const priceVal = parseInt(price, 10);
    if (isNaN(priceVal) || priceVal <= 0) { setErr('Price is required'); return; }

    setBusy(true);
    setErr(null);
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await createProduct({
        vendor_id: vendorId,
        title: title.trim(),
        price_minor: priceVal,
        currency_code: CURRENCY,
        merch_category_id: deptId || null,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        initial_on_hand: initialOnHand ? parseInt(initialOnHand, 10) : null,
        cost_price_minor: costPrice ? parseInt(costPrice, 10) : null,
        brand: brand.trim() || null,
        supplier_name: supplier.trim() || null,
        description: description.trim() || null,
        tags: tagList.length > 0 ? tagList : undefined,
        low_stock_threshold: lowStockThreshold ? parseInt(lowStockThreshold, 10) : null,
        internal_notes: internalNotes.trim() || null,
        schema_fields: {
          best_before: bestBefore.trim() || undefined,
          pack_size: packSize.trim() || undefined,
          country_of_origin: countryOfOrigin.trim() || undefined,
        },
      });
      if (resetAfter) resetForm();
      else navigate('/manager/catalog');
    } catch (e: any) {
      setErr(e?.message ?? 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  const handleSave = () => submitProduct(false);
  const handleSaveAndAnother = () => submitProduct(true);

  return (
    <div className="add-product-screen">
      {/* Header */}
      <div className="add-product-screen__header">
        <button
          type="button"
          className="add-product-screen__back-btn"
          aria-label="Back"
          onClick={() => navigate(-1)}
        >
          ‹
        </button>
        <div className="add-product-screen__title-block">
          <h1 className="add-product-screen__title">Add product</h1>
          <div className="add-product-screen__subtitle">Step 2 of 2 · Fill details</div>
        </div>
      </div>

      {/* Two-column shell */}
      <div className="add-product-screen__shell">
        {/* Left: form */}
        <div className="add-product-screen__form-col">

          {/* Required card */}
          <div className="add-product-screen__card">
            <div className="add-product-screen__card-header">
              <h3>Required</h3>
              <span className="add-product-screen__pill add-product-screen__pill--req">● Required</span>
            </div>
            <div className="add-product-screen__card-body">

              {/* Title */}
              <div className="add-product-screen__field add-product-screen__field--full">
                <label className="add-product-screen__lbl" htmlFor="aps-title">
                  Title <span className="add-product-screen__req">*</span>
                </label>
                <input
                  id="aps-title"
                  aria-label="Title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Product title"
                />
                <div className="add-product-screen__hint">
                  Shown on receipts and customer-facing app. Keep it scannable.
                </div>
              </div>

              {/* Price */}
              <div className="add-product-screen__field add-product-screen__field--third">
                <label className="add-product-screen__lbl" htmlFor="aps-price">
                  Price <span className="add-product-screen__req">*</span>
                </label>
                <div className="add-product-screen__input-suffix">
                  <input
                    id="aps-price"
                    aria-label="Price"
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="add-product-screen__mono"
                  />
                  <span className="add-product-screen__suffix">IQD</span>
                </div>
              </div>

              {/* Department */}
              <div className="add-product-screen__field add-product-screen__field--third">
                <label className="add-product-screen__lbl" htmlFor="aps-dept">
                  Department
                </label>
                <select
                  id="aps-dept"
                  aria-label="Department"
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* More details accordion */}
          <div className="add-product-screen__card">
            <div className="add-product-screen__card-header add-product-screen__card-header--accordion">
              <h3>More details</h3>
              <span className="add-product-screen__pill add-product-screen__pill--opt">○ Optional</span>
              <span className="add-product-screen__accordion-meta">11 fields</span>
              <button
                type="button"
                className={`add-product-screen__accordion-toggle${moreOpen ? ' open' : ''}`}
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((prev) => !prev)}
              >
                More details — {moreOpen ? 'collapse' : 'expand'}
              </button>
            </div>

            {/* Accordion body — always in DOM, hidden via attribute */}
            <div
              className="add-product-screen__card-body add-product-screen__card-body--accordion"
              hidden={!moreOpen}
            >

              {/* Description */}
              <div className="add-product-screen__field add-product-screen__field--full">
                <label className="add-product-screen__lbl" htmlFor="aps-description">Description</label>
                <textarea
                  id="aps-description"
                  aria-label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Product description…"
                />
              </div>

              {/* Brand */}
              <div className="add-product-screen__field add-product-screen__field--half">
                <label className="add-product-screen__lbl" htmlFor="aps-brand">Brand</label>
                <input
                  id="aps-brand"
                  aria-label="Brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Pinar"
                />
              </div>

              {/* Supplier */}
              <div className="add-product-screen__field add-product-screen__field--half">
                <label className="add-product-screen__lbl" htmlFor="aps-supplier">Supplier</label>
                <input
                  id="aps-supplier"
                  aria-label="Supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Supplier name"
                />
              </div>

              {/* Cost price */}
              <div className="add-product-screen__field add-product-screen__field--third">
                <label className="add-product-screen__lbl" htmlFor="aps-cost">
                  Cost price <span className="add-product-screen__info">internal</span>
                </label>
                <div className="add-product-screen__input-suffix">
                  <input
                    id="aps-cost"
                    aria-label="Cost price"
                    type="number"
                    min={0}
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0"
                    className="add-product-screen__mono"
                  />
                  <span className="add-product-screen__suffix">IQD</span>
                </div>
                {margin && (
                  <div className="add-product-screen__hint">
                    Margin: <strong className="add-product-screen__margin">{margin}</strong>
                  </div>
                )}
              </div>

              {/* Low stock threshold */}
              <div className="add-product-screen__field add-product-screen__field--third">
                <label className="add-product-screen__lbl" htmlFor="aps-low-stock">
                  Low-stock threshold
                </label>
                <input
                  id="aps-low-stock"
                  aria-label="Low-stock threshold"
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder="10"
                  className="add-product-screen__mono"
                />
                <div className="add-product-screen__hint">Alert below this</div>
              </div>

              {/* Initial on-hand */}
              <div className="add-product-screen__field add-product-screen__field--third">
                <label className="add-product-screen__lbl" htmlFor="aps-on-hand">
                  Initial on-hand
                </label>
                <input
                  id="aps-on-hand"
                  aria-label="Initial on-hand"
                  type="number"
                  min={0}
                  value={initialOnHand}
                  onChange={(e) => setInitialOnHand(e.target.value)}
                  placeholder="0"
                  className="add-product-screen__mono"
                />
              </div>

              {/* SKU */}
              <div className="add-product-screen__field add-product-screen__field--half">
                <label className="add-product-screen__lbl" htmlFor="aps-sku">SKU</label>
                <input
                  id="aps-sku"
                  aria-label="SKU"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="auto-generated"
                  className="add-product-screen__mono"
                />
              </div>

              {/* Barcode */}
              <div className="add-product-screen__field add-product-screen__field--half">
                <label className="add-product-screen__lbl" htmlFor="aps-barcode">Barcode</label>
                <input
                  id="aps-barcode"
                  aria-label="Barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or type barcode"
                  className="add-product-screen__mono"
                />
              </div>

              {/* Tags */}
              <div className="add-product-screen__field add-product-screen__field--full">
                <label className="add-product-screen__lbl" htmlFor="aps-tags">
                  Tags <span className="add-product-screen__info">comma-separated</span>
                </label>
                <input
                  id="aps-tags"
                  aria-label="Tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Halal, UHT, Long-life…"
                />
                <div className="add-product-screen__hint">
                  Featured tags surface in customer browse
                </div>
              </div>

              {/* Schema banner */}
              <div className="add-product-screen__schema-banner">
                <div className="add-product-screen__schema-dot">⚡</div>
                <span>
                  Showing 3 vendor-configurable schema fields for{' '}
                  <strong>{selectedDept?.name ?? 'your department'}</strong> — a clothes vendor would
                  see Size / Color / Material here instead. Edit in Settings → Catalog schema.
                </span>
              </div>

              {/* Best-before date */}
              <div className="add-product-screen__field add-product-screen__field--third">
                <label className="add-product-screen__lbl" htmlFor="aps-best-before">
                  Best-before date <span className="add-product-screen__info">schema</span>
                </label>
                <input
                  id="aps-best-before"
                  aria-label="Best-before date"
                  type="text"
                  value={bestBefore}
                  onChange={(e) => setBestBefore(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="add-product-screen__mono"
                />
                <div className="add-product-screen__hint">Drives expiry alerts &amp; FIFO at the register</div>
              </div>

              {/* Pack size */}
              <div className="add-product-screen__field add-product-screen__field--third">
                <label className="add-product-screen__lbl" htmlFor="aps-pack-size">
                  Pack size <span className="add-product-screen__info">schema</span>
                </label>
                <input
                  id="aps-pack-size"
                  aria-label="Pack size"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  placeholder="e.g. 1 L · 500 g · 12 pcs"
                />
                <div className="add-product-screen__hint">Shown on the customer browse card</div>
              </div>

              {/* Country of origin */}
              <div className="add-product-screen__field add-product-screen__field--third">
                <label className="add-product-screen__lbl" htmlFor="aps-country">
                  Country of origin <span className="add-product-screen__info">schema</span>
                </label>
                <input
                  id="aps-country"
                  aria-label="Country of origin"
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  placeholder="e.g. Turkey"
                />
                <div className="add-product-screen__hint">Halal cert &amp; import context</div>
              </div>

              {/* Internal notes */}
              <div className="add-product-screen__field add-product-screen__field--full">
                <label className="add-product-screen__lbl" htmlFor="aps-notes">
                  Internal notes <span className="add-product-screen__info">never shown to customer</span>
                </label>
                <textarea
                  id="aps-notes"
                  aria-label="Internal notes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything the cashier or you should know — supplier issues, seasonal pricing, etc."
                />
              </div>

            </div>
          </div>

          {err && <div className="add-product-screen__error">{err}</div>}

        </div>

        {/* Right: live preview */}
        <aside className="add-product-screen__preview-col">
          <div className="add-product-screen__preview-card">
            <div className="add-product-screen__preview-label">Live preview · customer view</div>
            <div className="add-product-screen__preview-thumb">📦</div>
            <div className="add-product-screen__preview-title">
              {title.trim() || 'Untitled product'}
            </div>
            <div className="add-product-screen__preview-meta">
              {[selectedDept?.name, brand.trim() || undefined]
                .filter(Boolean)
                .join(' · ') || 'No department selected'}
            </div>
            <div className="add-product-screen__preview-price-row">
              <span className="add-product-screen__preview-price">
                {price ? parseInt(price, 10).toLocaleString() : '—'}
                <small>IQD</small>
              </span>
            </div>
          </div>

          <div className="add-product-screen__tips-card">
            <strong>💡 Tip:</strong> Cost price and supplier are internal-only — they drive your
            margin calc and reports. The customer app only sees title, price, image, and tags.
          </div>

          <div className="add-product-screen__tips-card add-product-screen__tips-card--emerald">
            <strong>🧩 Schema fields are per-category &amp; per-vendor.</strong> Grocery vendors
            get Best-before / Pack size / Country. A clothes vendor would see Size / Color /
            Material here. Edit your shop's schema in Settings → Catalog schema.
          </div>
        </aside>
      </div>

      {/* Sticky save bar */}
      <div className="add-product-screen__save-bar">
        <div className="add-product-screen__save-meta">
          {isReady && <span className="add-product-screen__save-ok">● Ready to save</span>}
          {!isReady && <span>Fill title and price to save</span>}
        </div>
        <button
          type="button"
          className="add-product-screen__btn add-product-screen__btn--ghost"
          onClick={() => alert('Save as draft — coming soon')}
        >
          Save as draft
        </button>
        <button
          type="button"
          className="add-product-screen__btn add-product-screen__btn--secondary"
          disabled={busy}
          onClick={handleSaveAndAnother}
        >
          Save &amp; add another
        </button>
        <button
          type="button"
          className="add-product-screen__btn add-product-screen__btn--primary"
          disabled={busy}
          onClick={handleSave}
        >
          ✓ Save product
        </button>
      </div>
    </div>
  );
}
