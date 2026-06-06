import React from 'react';
import type { CartItem } from '../../state/cart';

interface CartRowProps {
  item: CartItem;
  onInc: () => void;
  onDec: () => void;
  fresh?: boolean;
}

function formatPrice(minor: number): string {
  return minor.toLocaleString('en-IQ') + ' IQD';
}

export function CartRow({ item, onInc, onDec, fresh }: CartRowProps) {
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    background: 'var(--paper-2)',
    border: item.weigh_at_counter
      ? '1px dashed var(--gold)'
      : fresh
      ? '1px solid var(--emerald)'
      : '1px solid var(--line-3)',
    boxShadow: fresh && !item.weigh_at_counter ? '0 0 0 3px var(--bg-success)' : undefined,
    borderRadius: 'var(--radius-xl)',
    padding: '9px 11px',
    marginBottom: 8,
  };

  return (
    <div style={rowStyle}>
      {/* Thumbnail */}
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 9,
        background: 'var(--ivory)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 19,
        flexShrink: 0,
        border: '1px solid var(--line-3)',
      }}>
        🛒
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700,
          fontSize: 13.5,
          lineHeight: 1.2,
          letterSpacing: '-.01em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.title}
        </div>
        <div style={{
          font: '600 11px/1 var(--sans)',
          color: 'var(--ink-3)',
          marginTop: 3,
          display: 'flex',
          gap: 7,
          alignItems: 'center',
        }}>
          {item.weigh_at_counter ? (
            <span style={{
              font: '700 9px/1 var(--mono)',
              padding: '3px 6px',
              borderRadius: 5,
              letterSpacing: '.04em',
              color: 'var(--gold-3)',
              background: 'var(--bg-warn)',
            }}>weigh at counter</span>
          ) : (
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>
              {formatPrice(item.unit_price_minor)}
            </span>
          )}
          {fresh && !item.weigh_at_counter && (
            <span style={{
              font: '700 9px/1 var(--mono)',
              padding: '3px 6px',
              borderRadius: 5,
              letterSpacing: '.04em',
              color: 'var(--emerald)',
              background: 'var(--bg-success)',
            }}>✓ added</span>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid var(--line-2)',
        borderRadius: 999,
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <button
          onClick={onDec}
          style={{
            width: 26,
            height: 26,
            border: 'none',
            background: 'var(--paper-2)',
            font: '700 15px/1 var(--mono)',
            color: 'var(--ink-2)',
            cursor: 'pointer',
          }}
        >−</button>
        <span style={{
          width: 24,
          textAlign: 'center',
          font: '700 12px/1 var(--mono)',
        }}>{item.qty}</span>
        <button
          onClick={onInc}
          style={{
            width: 26,
            height: 26,
            border: 'none',
            background: 'var(--paper-2)',
            font: '700 15px/1 var(--mono)',
            color: 'var(--ink-2)',
            cursor: 'pointer',
          }}
        >+</button>
      </div>
    </div>
  );
}
