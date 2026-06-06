import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../state/session';
import { fetchCashiers, verifyCashierPin, type CashierListItem } from '../../api/scan';
import { VENDOR_ID } from '../../env';

const PIN_LENGTH = 4;

export function LoginScreen() {
  const navigate = useNavigate();
  const session = useSession();
  const [cashiers, setCashiers] = useState<CashierListItem[]>([]);
  const [selected, setSelected] = useState<CashierListItem | null>(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already signed in, go to scan
  useEffect(() => {
    if (session.cashier_id) navigate('/', { replace: true });
  }, [session.cashier_id, navigate]);

  useEffect(() => {
    fetchCashiers(VENDOR_ID)
      .then(setCashiers)
      .catch(() => setCashiers([]));
  }, []);

  async function handlePin(digit: string) {
    if (digit === 'del') {
      setPin((p) => p.slice(0, -1));
      setErr(null);
      return;
    }
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      await submit(next);
    }
  }

  async function submit(pinValue: string) {
    if (!selected) return;
    setLoading(true);
    setErr(null);
    try {
      const cashier = await verifyCashierPin(selected.id, pinValue);
      session.signIn({ cashier_id: cashier.id, cashier_name: cashier.name, role: cashier.role });
      navigate('/', { replace: true });
    } catch {
      setErr('Wrong PIN — try again');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(420px 240px at 50% 14%,rgba(184,138,58,.14),transparent 60%), var(--paper)',
    }}>
      {/* Logo */}
      <div style={{
        width: 58,
        height: 58,
        borderRadius: 16,
        background: 'linear-gradient(135deg,var(--gold),var(--gold-3))',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 800,
        fontSize: 28,
        marginBottom: 16,
        boxShadow: 'var(--shadow-md)',
      }}>H</div>

      <h2 style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.01em', margin: 0 }}>
        Scan &amp; Go
      </h2>
      <div style={{
        font: '600 11px/1 var(--mono)',
        color: 'var(--ink-3)',
        textTransform: 'uppercase',
        letterSpacing: '.1em',
        marginTop: 6,
        marginBottom: 24,
      }}>
        {selected ? selected.name + ' · PIN' : 'Staff · Select name'}
      </div>

      {/* Staff selector */}
      {!selected && (
        <div style={{ width: '100%', maxWidth: 280, marginBottom: 24 }}>
          {cashiers.length === 0 && (
            <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: 13 }}>
              Loading staff list…
            </p>
          )}
          {cashiers.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelected(c); setPin(''); setErr(null); }}
              style={{
                width: '100%',
                padding: '12px 16px',
                marginBottom: 8,
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--line-2)',
                background: 'var(--paper-2)',
                fontFamily: 'var(--sans)',
                fontWeight: 700,
                fontSize: 14,
                color: 'var(--ink)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span>{c.name}</span>
              <span style={{ color: 'var(--ink-3)', fontWeight: 600, fontSize: 12 }}>{c.role}</span>
            </button>
          ))}
        </div>
      )}

      {/* PIN dots */}
      {selected && (
        <>
          <div style={{ display: 'flex', gap: 13, marginBottom: 26 }}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: 99,
                  border: i < pin.length ? 'none' : '2px solid var(--line)',
                  background: i < pin.length ? 'var(--gold)' : 'transparent',
                  transition: 'background .15s, border .15s',
                }}
              />
            ))}
          </div>

          {/* Numpad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 64px)',
            gap: 13,
          }}>
            {keys.map((k, idx) => (
              <button
                key={idx}
                disabled={loading || k === ''}
                onClick={() => k !== '' && handlePin(k)}
                style={{
                  height: 56,
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--line-3)',
                  background: k === '' ? 'transparent' : 'var(--paper-2)',
                  font: '700 22px/1 var(--mono)',
                  color: k === 'del' ? 'var(--ink-3)' : 'var(--ink-2)',
                  cursor: k === '' ? 'default' : 'pointer',
                  visibility: k === '' ? 'hidden' : 'visible',
                  boxShadow: k !== '' ? 'var(--shadow-sm)' : 'none',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: k === 'del' ? 18 : 22,
                }}
              >
                {k === 'del' ? '⌫' : k}
              </button>
            ))}
          </div>

          {err && (
            <p style={{ color: 'var(--burgundy)', fontSize: 13, fontWeight: 600, marginTop: 16 }}>
              {err}
            </p>
          )}

          <button
            onClick={() => { setSelected(null); setPin(''); setErr(null); }}
            style={{
              marginTop: 16,
              background: 'transparent',
              border: 'none',
              font: '600 12px/1 var(--mono)',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              letterSpacing: '.04em',
            }}
          >
            ← switch staff
          </button>
        </>
      )}

      <div style={{
        marginTop: 24,
        font: '600 11px/1 var(--mono)',
        color: 'var(--gold-3)',
        background: 'var(--bg-warn)',
        padding: '8px 12px',
        borderRadius: 999,
      }}>
        Staff-only for now
      </div>
    </div>
  );
}
