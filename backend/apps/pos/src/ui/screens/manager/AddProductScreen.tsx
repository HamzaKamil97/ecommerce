import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCategories, barcodeLookup, classifyName, createProduct,
  type CategoryDTO, type FieldDef,
} from '../../../api/pos';
import { getCachedSchema } from '../../../db/schema-cache';
import { SchemaFieldRenderer } from '../../components/SchemaFieldRenderer';
import { VENDOR_ID } from '../../../env';

export function AddProductScreen() {
  const nav = useNavigate();
  const [cats, setCats] = useState<CategoryDTO[]>([]);
  const [picked, setPicked] = useState<CategoryDTO | null>(null);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [schemaValues, setSchemaValues] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [thumb, setThumb] = useState<string | null>(null);
  const [stock, setStock] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);

  useEffect(() => { fetchCategories().then(setCats).catch(() => setCats([])); }, []);

  async function onLookup() {
    if (!barcode) return;
    setLookupMsg('Looking up…');
    const r = await barcodeLookup(barcode).catch(() => null);
    if (!r || !r.found) { setLookupMsg('Not found in catalog — fill manually.'); return; }
    if (r.name) setTitle(r.name);
    if (r.image_url) setThumb(r.image_url);
    if (r.weight_grams != null) setSchemaValues((v) => ({ ...v, weight_grams: r.weight_grams }));
    if (r.brand) setSchemaValues((v) => ({ ...v, brand: r.brand }));
    setLookupMsg('Filled from OpenFoodFacts.');
    if (!picked && r.name) {
      const cls = await classifyName(r.name).catch(() => null);
      if (cls && cls.category_handle) {
        const c = cats.find((x) => x.handle === cls.category_handle);
        if (c) await selectCategory(c);
      }
    }
  }

  async function selectCategory(c: CategoryDTO) {
    setPicked(c);
    const s = await getCachedSchema(c.handle);
    setFields(s.fields);
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      if (!picked) throw new Error('pick a category');
      if (!title) throw new Error('title required');
      if (price === '') throw new Error('price required');
      await createProduct({
        vendor_id: VENDOR_ID,
        title, price_minor: Number(price), currency_code: 'iqd',
        category_handle: picked.handle, schema_fields: schemaValues,
        barcode: barcode || undefined, sku: sku || undefined,
        thumbnail: thumb || undefined, initial_on_hand: stock,
      });
      nav('/manager/catalog');
    } catch (e: any) { setErr(e?.message ?? 'save failed'); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <h1>Add product</h1>
      <section>
        <label htmlFor="bc">Barcode</label>
        <input id="bc" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        <button onClick={onLookup}>Lookup</button>
        {lookupMsg && <p>{lookupMsg}</p>}
      </section>
      <section>
        <h3>Category</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cats.map((c) => (
            <button key={c.handle} onClick={() => selectCategory(c)}
              style={{ outline: picked?.handle === c.handle ? '2px solid var(--accent)' : 'none' }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <label>Title<input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Price (minor IQD)<input aria-label="Price (minor IQD)" type="number"
          value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} /></label>
        <label>SKU<input value={sku} onChange={(e) => setSku(e.target.value)} /></label>
        <label>Initial on-hand<input type="number" value={stock}
          onChange={(e) => setStock(Number(e.target.value))} /></label>
      </section>
      {picked && (
        <section>
          <h3>{picked.name} fields</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {fields.map((f) => (
              <SchemaFieldRenderer key={f.key} field={f} value={schemaValues[f.key]}
                onChange={(v) => setSchemaValues((s) => ({ ...s, [f.key]: v }))} />
            ))}
          </div>
        </section>
      )}
      {thumb && <img src={thumb} alt="" style={{ maxWidth: 120 }} />}
      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      <hr />
      <button onClick={save} disabled={busy}>Save</button>
      <button onClick={() => nav('/manager/catalog')}>Cancel</button>
    </div>
  );
}
