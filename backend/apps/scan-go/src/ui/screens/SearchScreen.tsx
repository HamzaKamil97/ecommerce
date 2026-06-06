import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../state/cart';
import { useSession } from '../../state/session';
import { lookupName, addLine, type NameLookupMatch } from '../../api/scan';

function formatPrice(minor: number): string {
  return minor.toLocaleString('en-IQ') + ' IQD';
}

export function SearchScreen() {
  const navigate = useNavigate();
  const session = useSession();
  const cart = useCart();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NameLookupMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const matches = await lookupName(val.trim());
        setResults(matches);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
  }

  function handleAdd(match: NameLookupMatch) {
    if (!match.sellable) return;
    cart.addItem({
      variant_id: match.variant_id,
      title: match.title,
      unit_price_minor: match.price_minor,
      weigh_at_counter: match.weigh_at_counter,
      qty: 1,
    });
    setAdded((prev) => new Set(prev).add(match.variant_id));

    // Sync to backend
    if (cart.cart_id) {
      addLine(cart.cart_id, {
        variant_id: match.variant_id,
        title: match.title,
        qty: 1,
        unit_price_minor: match.price_minor,
        weigh_at_counter: match.weigh_at_counter,
      }).catch(console.error);
    }

    navigate('/');
  }

  const resultCount = results.length;

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--paper)',
    }}>
      {/* Header / search bar */}
      <div style={{
        padding: '30px 16px 12px',
        background: 'linear-gradient(180deg,var(--paper-2),var(--paper))',
        borderBottom: '1px solid var(--line-3)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '11px 13px',
          border: '1.5px solid var(--gold-2)',
          borderRadius: 999,
          background: 'var(--paper-2)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <span style={{ fontSize: 16, color: 'var(--ink-3)' }}>🔎</span>
          <input
            autoFocus
            type="text"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              font: '600 13px/1 var(--sans)',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-3)',
                cursor: 'pointer',
                fontSize: 14,
                padding: 0,
              }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}>
        {query.trim() && !searching && resultCount > 0 && (
          <div style={{
            font: '700 10px/1 var(--mono)',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            margin: '2px 2px 9px',
          }}>
            {resultCount} match{resultCount !== 1 ? 'es' : ''} · live stock
          </div>
        )}
        {searching && (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
            Searching…
          </p>
        )}
        {!searching && query.trim() && results.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
            No matches for "{query}"
          </p>
        )}
        {results.map((m) => {
          const sellable = m.sellable ?? false;
          return (
            <div
              key={m.variant_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '10px 4px',
                borderBottom: '1px solid var(--line-3)',
                opacity: sellable ? 1 : 0.55,
              }}
            >
              {/* Thumb */}
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
                <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '-.01em' }}>
                  {m.title}
                </div>
                <div style={{ font: '600 11px/1 var(--sans)', color: 'var(--ink-3)', marginTop: 3, display: 'flex', gap: 7, alignItems: 'center' }}>
                  {m.weigh_at_counter ? (
                    <span style={{
                      font: '700 9px/1 var(--mono)',
                      padding: '3px 6px',
                      borderRadius: 5,
                      letterSpacing: '.04em',
                      color: 'var(--gold-3)',
                      background: 'var(--bg-warn)',
                    }}>weigh at counter</span>
                  ) : (
                    <>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>
                        {formatPrice(m.price_minor)}
                      </span>
                      {m.qty_available > 0 && (
                        <span>· {m.qty_available} in stock</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Add / OOS badge */}
              {sellable ? (
                <button
                  onClick={() => handleAdd(m)}
                  style={{
                    marginLeft: 'auto',
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: added.has(m.variant_id) ? 'var(--emerald-2)' : 'var(--emerald)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    font: '700 18px/1 var(--mono)',
                    flexShrink: 0,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {added.has(m.variant_id) ? '✓' : '+'}
                </button>
              ) : (
                <span style={{
                  marginLeft: 'auto',
                  font: '700 10px/1 var(--mono)',
                  color: 'var(--burgundy)',
                  background: 'var(--bg-danger)',
                  padding: '5px 8px',
                  borderRadius: 6,
                }}>out of stock</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        padding: '12px 14px 16px',
        borderTop: '1px solid var(--line-3)',
        background: 'linear-gradient(180deg,transparent,var(--paper) 22%)',
      }}>
        <button
          onClick={() => navigate('/')}
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
          ← Back to scanning
        </button>
      </div>
    </div>
  );
}
