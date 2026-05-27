import { useMemo, useState } from 'react';
import { useCart } from '../../state/cart';
import { commitSale, CommitResult } from '../../state/checkout';
import { buildReceipt } from '../../hardware/escpos';
import { sendBytes, isPaired, pairPrinter } from '../../hardware/printer-webserial';
import { openDrawer } from '../../hardware/cash-drawer';
import { useSession } from '../../state/session';
import { VENDOR_ID } from '../../env';
import './PaymentScreen.css';

/** Thousands-separator format e.g. "13,500". IQD has no fractional minor units. */
function formatIQD(minor: number): string {
  return Math.abs(minor).toLocaleString('en-US');
}

/** Short 4-digit order suffix for the header subtitle. Generated once per mount. */
function makeOrderId(): string {
  const r = Math.floor(Math.random() * 9000 + 1000);
  return `HN-2026-${r}`;
}

export function PaymentScreen({ onClose }: { onClose: () => void }) {
  const subtotal = useCart((s) => s.subtotalMinor());
  const lines = useCart((s) => s.lines);
  const itemCount = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const cashier = useSession((s) => s.cashier_name) ?? '—';

  const [receivedMinor, setReceivedMinor] = useState(0);
  const [done, setDone] = useState<CommitResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const orderId = useMemo(makeOrderId, []);

  const changeMinor = receivedMinor - subtotal;
  const canConfirm = receivedMinor >= subtotal && subtotal > 0;

  const appendDigit = (n: number) => setReceivedMinor((r) => r * 10 + n);
  const appendTripleZero = () => setReceivedMinor((r) => r * 1000);
  const backspace = () => setReceivedMinor((r) => Math.floor(r / 10));
  const addCash = (denom: number) => setReceivedMinor((r) => r + denom);
  const setExact = () => setReceivedMinor(subtotal);

  async function confirm() {
    setErr(null);
    if (!canConfirm) return;
    const snapshotLines = lines.map((l) => ({
      name: l.name,
      qty: l.qty,
      unit_price_minor: l.unit_price_minor,
      line_total_minor: l.qty * l.unit_price_minor,
    }));
    try {
      const result = await commitSale({ paid_amount_minor: receivedMinor });
      setDone(result);
      try {
        if (!isPaired()) await pairPrinter();
        const bytes = buildReceipt({
          shop_name: 'Hanoot Shop',
          vendor_address: VENDOR_ID,
          sale_id: result.client_id,
          cashier_name: cashier,
          currency: 'IQD',
          lines: snapshotLines,
          subtotal_minor: result.total_minor,
          paid_minor: receivedMinor,
          change_minor: result.change_due_minor,
          printed_at: new Date(),
        });
        await sendBytes(bytes);
        await openDrawer();
      } catch (e: any) {
        setErr(`Printer offline: ${e?.message ?? e}`);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  if (done) {
    return (
      <div className="payment-screen" data-theme="dark">
        <div className="payment-done">
          <h1>Paid</h1>
          <p className="label-dark">Change due</p>
          <div className="change-line">{formatIQD(done.change_due_minor)} IQD</div>
          {err && <div className="payment-error">{err}</div>}
          <button className="new-sale-btn" onClick={onClose}>New sale</button>
        </div>
      </div>
    );
  }

  const changeClass =
    receivedMinor === 0
      ? 'change-zero'
      : changeMinor > 0
        ? 'change-pos'
        : changeMinor < 0
          ? 'change-neg'
          : 'change-zero';
  const changeDisplay = receivedMinor === 0
    ? '— IQD'
    : changeMinor < 0
      ? `-${formatIQD(changeMinor)} IQD`
      : `${formatIQD(changeMinor)} IQD`;

  return (
    <div className="payment-screen" data-theme="dark">
      <div className="payment-header">
        <button
          className="back-btn"
          onClick={onClose}
          aria-label="Back"
          type="button"
        >
          ←
        </button>
        <div>
          <h1>Cash payment</h1>
          <p>
            {itemCount} {itemCount === 1 ? 'item' : 'items'} · order {orderId}
          </p>
        </div>
      </div>

      <div className="total-card">
        <div className="total-block">
          <div className="label-dark">Total due</div>
          <div className="total-amount">{formatIQD(subtotal)} IQD</div>
        </div>

        <div className="paid-block">
          <div>
            <div className="label-dark">Cash received</div>
            <input
              className="paid-input"
              value={receivedMinor === 0 ? '' : formatIQD(receivedMinor)}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d]/g, '');
                setReceivedMinor(digits ? Number(digits) : 0);
              }}
              inputMode="numeric"
              aria-label="Cash received"
              placeholder="0"
            />
          </div>
          <div>
            <div className="label-dark">Change due</div>
            <div className={`change-amount ${changeClass}`}>{changeDisplay}</div>
          </div>
        </div>
      </div>

      {err && <div className="payment-error" style={{ marginTop: 10 }}>{err}</div>}

      <div className="chips-row">
        <button
          type="button"
          className="chip-cash exact"
          onClick={setExact}
          aria-label="Exact"
        >
          Exact
        </button>
        <button
          type="button"
          className="chip-cash"
          onClick={() => addCash(1000)}
          aria-label="+1k"
        >
          +1,000
        </button>
        <button
          type="button"
          className="chip-cash"
          onClick={() => addCash(5000)}
          aria-label="+5k"
        >
          +5,000
        </button>
        <button
          type="button"
          className="chip-cash"
          onClick={() => addCash(10000)}
          aria-label="+10k"
        >
          +10,000
        </button>
        <button
          type="button"
          className="chip-cash"
          onClick={() => addCash(25000)}
          aria-label="+25k"
        >
          +25,000
        </button>
      </div>

      <div className="keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            className="key"
            onClick={() => appendDigit(n)}
          >
            {n}
          </button>
        ))}
        <button type="button" className="key dot" onClick={appendTripleZero}>
          000
        </button>
        <button type="button" className="key" onClick={() => appendDigit(0)}>
          0
        </button>
        <button
          type="button"
          className="key backspace"
          onClick={backspace}
          aria-label="Backspace"
        >
          ⌫
        </button>
      </div>

      <button
        type="button"
        className="confirm-btn"
        onClick={confirm}
        disabled={!canConfirm}
      >
        <span>Confirm payment</span>
        <span className="amt">{formatIQD(receivedMinor)} IQD</span>
      </button>
    </div>
  );
}
