import { useState } from 'react';
import Papa from 'papaparse';
import { importCsv } from '../../../api/pos';
import { VENDOR_ID } from '../../../env';

export type PreviewResult = {
  headers: string[];
  rows: Record<string, string>[];
  totalRowCount: number;
};

export function previewCsv(csv: string, n: number): PreviewResult {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const data = parsed.data ?? [];
  return {
    headers: parsed.meta?.fields ?? [],
    rows: data.slice(0, n),
    totalRowCount: data.length,
  };
}

export function CsvImportScreen() {
  const [csv, setCsv] = useState<string>('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ total: number; created: number; failed: number; errors: Array<{ row: number; reason: string }> } | null>(null);

  async function onFile(f: File) {
    const text = await f.text();
    setCsv(text);
    setPreview(previewCsv(text, 5));
    setResult(null);
  }

  async function onUpload() {
    if (!csv) return;
    setBusy(true);
    try { setResult(await importCsv(VENDOR_ID, csv)); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <h1>CSV import</h1>
      <p>Headers expected: <code>title, sku, barcode, price_minor, currency_code, category_handle, initial_on_hand</code></p>
      <input type="file" accept=".csv,text/csv"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {preview && (
        <>
          <h3>Preview ({preview.totalRowCount} rows total)</h3>
          <table><thead><tr>{preview.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{preview.rows.map((r, i) => (
              <tr key={i}>{preview.headers.map((h) => <td key={h}>{r[h] ?? ''}</td>)}</tr>
            ))}</tbody>
          </table>
          <button onClick={onUpload} disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
        </>
      )}
      {result && (
        <section>
          <h3>Result</h3>
          <p>Total: {result.total} · Created: {result.created} · Failed: {result.failed}</p>
          {result.errors.length > 0 && (
            <table><thead><tr><th>Row</th><th>Reason</th></tr></thead>
              <tbody>{result.errors.map((e, i) => (
                <tr key={i}><td>{e.row}</td><td>{e.reason}</td></tr>
              ))}</tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
