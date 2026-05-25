import { useEffect, useState } from 'react';
import { Config, defaultConfig, loadConfig, saveConfig, QuickButton } from '../../state/config';
import { db } from '../../db/dexie';
import { syncCatalog } from '../../db/catalog-sync';
import { VENDOR_ID } from '../../env';
import { pairPrinter } from '../../hardware/printer-webserial';

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<Config>(defaultConfig);
  const [variants, setVariants] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadConfig().then(setCfg);
    db.catalog.toArray().then((rs) => setVariants(rs.map((r) => ({ id: r.variant_id, name: r.name }))));
  }, []);

  function update<K extends keyof Config>(k: K, v: Config[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
  }

  function addQuickButton(variantId: string) {
    const v = variants.find((x) => x.id === variantId);
    if (!v) return;
    const next: QuickButton = { variant_id: v.id, label: v.name, color: '#21d07a' };
    update('quick_buttons', [...cfg.quick_buttons, next]);
  }

  async function save() {
    setBusy(true);
    await saveConfig(cfg);
    setBusy(false);
    onClose();
  }

  async function refresh() {
    setBusy(true);
    try { await syncCatalog(VENDOR_ID); } finally { setBusy(false); }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1>Settings</h1>
      <label>Theme:
        <select value={cfg.theme} onChange={(e) => update('theme', e.target.value as 'dark' | 'light')}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
      <h2>Quick buttons</h2>
      <ul>{cfg.quick_buttons.map((b, i) => (
        <li key={b.variant_id}>
          {b.label}
          <button onClick={() => update('quick_buttons', cfg.quick_buttons.filter((_, j) => j !== i))}>×</button>
        </li>
      ))}</ul>
      <select onChange={(e) => { if (e.target.value) { addQuickButton(e.target.value); e.target.value = ''; } }} defaultValue="">
        <option value="">+ add from catalog…</option>
        {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <h2>Hardware</h2>
      <button onClick={() => pairPrinter().catch((e) => alert(e?.message ?? 'Pair failed'))}>Pair printer (WebSerial)</button>
      <button onClick={refresh} disabled={busy}>Refresh catalog</button>
      <hr />
      <button onClick={save} disabled={busy}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </main>
  );
}
