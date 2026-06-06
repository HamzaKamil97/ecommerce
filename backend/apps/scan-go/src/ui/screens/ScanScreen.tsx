import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../state/cart';
import { useSession } from '../../state/session';
import { lookupBarcode, createCart, addLine } from '../../api/scan';
import { decideScan } from '../../logic/scanDecision';
import { TotalBar } from '../components/TotalBar';
import { ScanViewport } from '../components/ScanViewport';
import { CartRow } from '../components/CartRow';
import { Toast, type ToastMessage } from '../components/Toast';

let toastSeq = 0;

export function ScanScreen() {
  const navigate = useNavigate();
  const session = useSession();
  const cart = useCart();

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);

  // Track remote line IDs so we can call updateLine/removeLine
  const lineIds = useRef<Map<string, string>>(new Map());

  // Guard: redirect if no session
  useEffect(() => {
    if (!session.cashier_id) {
      navigate('/login', { replace: true });
    }
  }, [session.cashier_id, navigate]);

  // Ensure a remote cart exists on mount
  useEffect(() => {
    if (!session.cashier_id) return;
    if (cart.cart_id) return;
    createCart(session.cashier_id)
      .then((sc) => cart.setCartId(sc.id))
      .catch(console.error);
  }, [session.cashier_id, cart.cart_id]);

  const showToast = useCallback((kind: 'ok' | 'bad', title: string, sub?: string) => {
    setToast({ id: ++toastSeq, kind, title, sub });
  }, []);

  async function handleScan(barcode: string) {
    if (scanning) return;
    setScanError(false);
    setScanning(true);
    try {
      const result = await lookupBarcode(barcode);
      const decision = decideScan(result);

      if (decision.action === 'reject') {
        const title = result.found
          ? `${(result as any).title ?? 'Item'} — out of stock`
          : `Unknown barcode`;
        showToast('bad', title, 'Not added · غير متوفر');
        setScanError(true);
        setTimeout(() => setScanError(false), 2000);
        return;
      }

      // Add to local state immediately (optimistic)
      cart.addItem({
        variant_id: decision.variant_id,
        title: decision.title,
        unit_price_minor: decision.price_minor,
        weigh_at_counter: decision.weigh_at_counter,
        qty: 1,
      });
      setFreshId(decision.variant_id);
      setTimeout(() => setFreshId(null), 2500);

      showToast(
        'ok',
        `${decision.title} added`,
        `In stock · ${decision.price_minor > 0 ? (decision.price_minor).toLocaleString('en-IQ') + ' IQD' : 'weigh at counter'}`,
      );

      // Sync to backend (fire and forget for now — store is source of truth)
      if (cart.cart_id) {
        addLine(cart.cart_id, {
          variant_id: decision.variant_id,
          title: decision.title,
          qty: 1,
          unit_price_minor: decision.price_minor,
          weigh_at_counter: decision.weigh_at_counter,
        })
          .then((line) => lineIds.current.set(decision.variant_id, line.id))
          .catch(console.error);
      }
    } catch (e) {
      showToast('bad', 'Lookup failed — try again');
      setScanError(true);
      setTimeout(() => setScanError(false), 2000);
    } finally {
      setScanning(false);
    }
  }

  function handleInc(variant_id: string) {
    cart.incQty(variant_id);
  }

  function handleDec(variant_id: string) {
    const item = cart.items.find((i) => i.variant_id === variant_id);
    if (item && item.qty <= 1) {
      cart.removeItem(variant_id);
    } else {
      cart.decQty(variant_id);
    }
  }

  const btnDisabled = cart.item_count === 0;

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--paper)',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        padding: '30px 16px 12px',
        background: 'linear-gradient(180deg,var(--paper-2),var(--paper))',
        borderBottom: '1px solid var(--line-3)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'linear-gradient(135deg,var(--gold),var(--gold-3))',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 15,
              boxShadow: 'var(--shadow-sm)',
            }}>H</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-.01em' }}>Scan &amp; Go</div>
              <div style={{ font: '600 10px/1 var(--mono)', color: 'var(--ink-3)', letterSpacing: '.08em', marginTop: 3, textTransform: 'uppercase' }}>
                Staff
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: 'var(--emerald)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 12,
            }}>
              {session.cashier_name?.[0]?.toUpperCase() ?? 'S'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 11.5, lineHeight: 1.2, textAlign: 'right' }}>
                {session.cashier_name ?? 'Staff'}
              </div>
              <div style={{ font: '600 9px/1 var(--mono)', color: 'var(--gold-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {session.role ?? ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Total bar */}
      <TotalBar subtotal_minor={cart.subtotal_minor} item_count={cart.item_count} />

      {/* Scan viewport */}
      <ScanViewport
        onScan={handleScan}
        error={scanError}
        hint={scanning ? 'Looking up…' : 'Point at a barcode'}
      />

      {/* Search link */}
      <div style={{ margin: '0 14px 12px', flexShrink: 0 }}>
        <Link
          to="/search"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '11px 13px',
            border: '1.5px solid var(--line-2)',
            borderRadius: 999,
            background: 'var(--paper-2)',
            textDecoration: 'none',
            color: 'var(--ink-3)',
          }}
        >
          <span style={{ fontSize: 16 }}>🔎</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Search by name…</span>
        </Link>
      </div>

      {/* Cart list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
        {cart.items.length > 0 && (
          <div style={{
            font: '700 10px/1 var(--mono)',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            margin: '2px 2px 9px',
          }}>
            In the cart
          </div>
        )}
        {cart.items.map((item) => (
          <CartRow
            key={item.variant_id}
            item={item}
            fresh={freshId === item.variant_id}
            onInc={() => handleInc(item.variant_id)}
            onDec={() => handleDec(item.variant_id)}
          />
        ))}
        {cart.items.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
            Scan a barcode to add items
          </p>
        )}
      </div>

      {/* Toast */}
      <Toast toast={toast} />

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        padding: '12px 14px 16px',
        background: 'linear-gradient(180deg,transparent,var(--paper) 22%)',
        borderTop: '1px solid var(--line-3)',
      }}>
        <button
          disabled={btnDisabled}
          onClick={() => navigate('/cart')}
          style={{
            width: '100%',
            padding: 15,
            fontSize: 15,
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-md)',
            border: 'none',
            background: 'linear-gradient(135deg,var(--gold),var(--gold-3))',
            color: '#fff',
            fontFamily: 'var(--sans)',
            fontWeight: 700,
            cursor: btnDisabled ? 'not-allowed' : 'pointer',
            opacity: btnDisabled ? 0.45 : 1,
            filter: btnDisabled ? 'grayscale(.3)' : 'none',
          }}
        >
          Send to cashier · {cart.item_count} item{cart.item_count !== 1 ? 's' : ''} →
        </button>
      </div>
    </div>
  );
}
