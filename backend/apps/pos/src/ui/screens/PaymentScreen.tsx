import { useState } from 'react';
import { NumPad } from '../components/NumPad';
import { useCart } from '../../state/cart';
import { commitSale, CommitResult } from '../../state/checkout';
import { buildReceipt } from '../../hardware/escpos';
import { sendBytes, isPaired, pairPrinter } from '../../hardware/printer-webserial';
import { openDrawer } from '../../hardware/cash-drawer';
import { useSession } from '../../state/session';
import { VENDOR_ID } from '../../env';

export function PaymentScreen({ onClose }: { onClose: () => void }) {
  const subtotal = useCart((s) => s.subtotalMinor());
  const lines = useCart((s) => s.lines);
  const cashier = useSession((s) => s.cashier_name) ?? '—';
  const [paid, setPaid] = useState('');
  const [done, setDone] = useState<CommitResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const paidMinor = Number(paid || '0');

  async function charge() {
    setErr(null);
    if (paidMinor < subtotal) { setErr('Paid amount is less than total'); return; }
    const snapshotLines = lines.map((l) => ({
      name: l.name, qty: l.qty,
      unit_price_minor: l.unit_price_minor,
      line_total_minor: l.qty * l.unit_price_minor,
    }));
    const result = await commitSale({ paid_amount_minor: paidMinor });
    setDone(result);
    try {
      if (!isPaired()) await pairPrinter();
      const bytes = buildReceipt({
        shop_name: 'Hanoot Shop', vendor_address: VENDOR_ID,
        sale_id: result.client_id, cashier_name: cashier, currency: 'IQD',
        lines: snapshotLines,
        subtotal_minor: result.total_minor, paid_minor: paidMinor, change_minor: result.change_due_minor,
        printed_at: new Date(),
      });
      await sendBytes(bytes);
      await openDrawer();
    } catch (e: any) {
      setErr(`Printer offline: ${e?.message ?? e}`);
    }
  }

  if (done) {
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1 style={{ color: 'var(--accent)' }}>Paid</h1>
        <p style={{ fontSize: 36 }}>Change: {(done.change_due_minor / 1000).toFixed(0)}k IQD</p>
        {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
        <button onClick={onClose} style={{ padding: 16, fontSize: 20 }}>New sale</button>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, height: '100vh' }}>
      <section>
        <h1>Total: {(subtotal / 1000).toFixed(0)}k IQD</h1>
        <input
          value={paid}
          onChange={(e) => setPaid(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="Paid (fils)"
          style={{ fontSize: 36, padding: 12, width: '100%' }}
          inputMode="numeric"
          autoFocus
        />
        {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
        <p style={{ fontSize: 24, color: 'var(--muted)' }}>
          Change: {Math.max(0, paidMinor - subtotal)} fils
        </p>
        <button onClick={charge} disabled={paidMinor < subtotal}
                style={{ padding: 16, fontSize: 20, background: 'var(--accent)', color: '#000', width: '100%' }}>
          Charge
        </button>
        <button onClick={onClose} style={{ padding: 16, marginTop: 8 }}>Cancel</button>
      </section>
      <NumPad value={paid} onChange={setPaid} />
    </main>
  );
}
