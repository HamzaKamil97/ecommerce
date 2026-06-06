import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../state/cart';
import { useSession } from '../../state/session';
import { sendCart } from '../../api/scan';
import { CartRow } from '../components/CartRow';

function formatIQD(minor: number): string {
  return minor.toLocaleString('en-IQ') + ' IQD';
}

export function CartReviewScreen() {
  const navigate = useNavigate();
  const session = useSession();
  const cart = useCart();
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSend() {
    if (!cart.cart_id) {
      setErr('No cart ID — go back and scan again.');
      return;
    }
    setSending(true);
    setErr(null);
    try {
      const sc = await sendCart(cart.cart_id);
      const code = sc.short_code ?? cart.cart_id;
      cart.lock(code);
      navigate(`/code/${cart.cart_id}`, { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to send cart — try again.');
    } finally {
      setSending(false);
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

  const weighCount = cart.items.filter((i) => i.weigh_at_counter).length;

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--paper)',
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
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '6px 9px',
                fontSize: 13,
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--line-2)',
                background: 'transparent',
                color: 'var(--ink-2)',
                fontFamily: 'var(--sans)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >←</button>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-.01em' }}>The cart</div>
              <div style={{ font: '600 10px/1 var(--mono)', color: 'var(--ink-3)', letterSpacing: '.08em', marginTop: 3 }}>
                {cart.item_count} item{cart.item_count !== 1 ? 's' : ''} · staff: {session.cashier_name ?? 'staff'}
              </div>
            </div>
          </div>
          <span style={{
            font: '700 9px/1 var(--mono)',
            padding: '3px 6px',
            borderRadius: 5,
            letterSpacing: '.04em',
            color: 'var(--emerald)',
            background: 'var(--bg-success)',
            fontSize: 10,
          }}>building</span>
        </div>
      </div>

      {/* Cart items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}>
        {cart.items.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
            Cart is empty — go back to scan.
          </p>
        )}
        {cart.items.map((item) => (
          <CartRow
            key={item.variant_id}
            item={item}
            onInc={() => handleInc(item.variant_id)}
            onDec={() => handleDec(item.variant_id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        padding: '12px 14px 16px',
        borderTop: '1px solid var(--line-3)',
        background: 'linear-gradient(180deg,transparent,var(--paper) 22%)',
      }}>
        {/* Subtotal row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--ink-3)' }}>
            Subtotal{' '}
            {weighCount > 0 && (
              <span style={{ fontSize: 11 }}>(+ weighed items)</span>
            )}
          </span>
          <span style={{ font: '800 17px/1 var(--mono)' }}>{formatIQD(cart.subtotal_minor)}</span>
        </div>

        {err && (
          <p style={{ color: 'var(--burgundy)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            {err}
          </p>
        )}

        <button
          disabled={cart.item_count === 0 || sending}
          onClick={handleSend}
          style={{
            width: '100%',
            padding: 15,
            fontSize: 15,
            borderRadius: 'var(--radius-xl)',
            border: 'none',
            background: 'linear-gradient(135deg,var(--gold),var(--gold-3))',
            color: '#fff',
            fontFamily: 'var(--sans)',
            fontWeight: 700,
            cursor: cart.item_count === 0 || sending ? 'not-allowed' : 'pointer',
            opacity: cart.item_count === 0 || sending ? 0.45 : 1,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {sending ? 'Sending…' : 'Send to cashier →'}
        </button>
      </div>
    </div>
  );
}
