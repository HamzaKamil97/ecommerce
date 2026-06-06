import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../../state/cart';
import { getByCode } from '../../api/scan';

const EXPIRY_SECONDS = 15 * 60; // 15 minutes

function formatIQD(minor: number): string {
  return minor.toLocaleString('en-IQ') + ' IQD';
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** CSS-only QR placeholder — matches mockup's .qr style */
function QrPlaceholder({ code }: { code: string }) {
  return (
    <div
      aria-label={`QR code for ${code}`}
      style={{
        width: 150,
        height: 150,
        borderRadius: 'var(--radius-xl)',
        background: '#fff',
        border: '1px solid var(--line-2)',
        padding: 12,
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        backgroundImage: [
          'linear-gradient(90deg,#1f1c18 0 0)',
          'repeating-linear-gradient(90deg,#1f1c18 0 8px,#fff 8px 16px)',
          'repeating-linear-gradient(0deg,#1f1c18 0 8px,#fff 8px 16px)',
        ].join(','),
        backgroundBlendMode: 'multiply',
        flexShrink: 0,
      }}
    >
      {/* Finder pattern overlay */}
      <div style={{
        position: 'absolute',
        inset: 12,
        background: [
          'radial-gradient(circle at 22% 22%,#1f1c18 0 16px,#fff 16px 22px,#1f1c18 22px 28px,transparent 29px)',
          'radial-gradient(circle at 78% 22%,#1f1c18 0 16px,#fff 16px 22px,#1f1c18 22px 28px,transparent 29px)',
          'radial-gradient(circle at 22% 78%,#1f1c18 0 16px,#fff 16px 22px,#1f1c18 22px 28px,transparent 29px)',
        ].join(','),
      }} />
    </div>
  );
}

export function CodeScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const cart = useCart();

  const [countdown, setCountdown] = useState(EXPIRY_SECONDS);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Try to get the short_code — from store first, then API
  const shortCode = cart.short_code;
  const subtotal = cart.subtotal_minor;
  const itemCount = cart.item_count;
  const weighCount = cart.items.filter((i) => i.weigh_at_counter).length;

  // Fetch cart from API to get expires_at if available
  useEffect(() => {
    if (!shortCode && id) {
      getByCode(id)
        .then((sc) => {
          if (sc.short_code) cart.lock(sc.short_code);
          if (sc.expires_at) setExpiresAt(new Date(sc.expires_at));
        })
        .catch(console.error);
    }
  }, [id, shortCode]);

  // Countdown tick
  useEffect(() => {
    if (expiresAt) {
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(diff);
    }
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (expiresAt) {
          const diff = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
          return diff;
        }
        return Math.max(0, prev - 1);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  function handleNewCart() {
    cart.clear();
    navigate('/', { replace: true });
  }

  const displayCode = shortCode ?? id ?? '—';

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
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-.01em' }}>Take to cashier</div>
            <div style={{ font: '600 10px/1 var(--mono)', color: 'var(--ink-3)', letterSpacing: '.08em', marginTop: 3, textTransform: 'uppercase' }}>
              Scan &amp; Go
            </div>
          </div>
        </div>
      </div>

      {/* Main handoff area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 22,
      }}>
        {/* Lock row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          font: '600 11px/1 var(--mono)',
          color: 'var(--emerald)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
        }}>
          🔒 Cart locked
        </div>

        <h2 style={{
          fontWeight: 800,
          fontSize: 20,
          letterSpacing: '-.02em',
          marginTop: 8,
          marginBottom: 4,
        }}>Show this at the till</h2>

        <p style={{
          fontSize: 12.5,
          color: 'var(--ink-3)',
          lineHeight: 1.5,
          maxWidth: 230,
          marginBottom: 18,
        }}>
          The cashier scans the code, weighs any loose items, and takes the cash.
        </p>

        {/* QR */}
        <QrPlaceholder code={displayCode} />

        {/* Short code */}
        <div style={{
          font: '800 30px/1 var(--mono)',
          letterSpacing: '.16em',
          color: 'var(--ink)',
          margin: '18px 0 6px',
          background: 'var(--ivory)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--line)',
        }}>
          {displayCode}
        </div>

        {/* Summary KV */}
        <div style={{
          width: '100%',
          maxWidth: 240,
          background: 'var(--paper-2)',
          border: '1px solid var(--line-3)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          marginTop: 4,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '11px 14px',
            fontSize: 12.5,
          }}>
            <span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>Items</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 12.5 }}>
              {itemCount}{weighCount > 0 ? ` (${weighCount} to weigh)` : ''}
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '11px 14px',
            fontSize: 12.5,
            borderTop: '1px solid var(--line-3)',
          }}>
            <span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>Subtotal</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 12.5 }}>
              {formatIQD(subtotal)}
            </span>
          </div>
        </div>

        {/* Expiry */}
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 14, lineHeight: 1.5 }}>
          Expires in{' '}
          <strong>{formatCountdown(countdown)}</strong>{' '}
          · single use. Editing the cart makes a new code.
        </div>
      </div>

      {/* Footer — new cart */}
      <div style={{
        flexShrink: 0,
        padding: '12px 14px 16px',
        borderTop: '1px solid var(--line-3)',
      }}>
        <button
          onClick={handleNewCart}
          style={{
            width: '100%',
            padding: 15,
            fontSize: 15,
            borderRadius: 'var(--radius-xl)',
            border: '1.5px solid var(--line-2)',
            background: 'transparent',
            fontFamily: 'var(--sans)',
            fontWeight: 700,
            color: 'var(--ink-2)',
            cursor: 'pointer',
          }}
        >
          + New cart
        </button>
      </div>
    </div>
  );
}
