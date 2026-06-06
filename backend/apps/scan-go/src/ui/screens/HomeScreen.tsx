import { VENDOR_ID } from '../../env';

export function HomeScreen() {
  return (
    <main style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <h1>Hanoot Scan &amp; Go</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        vendor: <code style={{ fontFamily: 'monospace' }}>{VENDOR_ID || '(not set)'}</code>
      </p>
      <p style={{ color: 'var(--muted)' }}>Home screen — real screens coming in next tasks.</p>
    </main>
  );
}
