import { useEffect, useState } from 'react';
import { useSession } from '../../state/session';
import { fetchCashiers, verifyCashierPin, CashierListItem } from '../../api/pos';
import { VENDOR_ID } from '../../env';
import { db } from '../../db/dexie';

export function LoginScreen() {
  const [cashiers, setCashiers] = useState<CashierListItem[]>([]);
  const [selected, setSelected] = useState<CashierListItem | null>(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const signIn = useSession((s) => s.signIn);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchCashiers(VENDOR_ID);
        setCashiers(list);
        await db.cashiers.bulkPut(list.map((c) => ({
          id: c.id, vendor_id: c.vendor_id, name: c.name,
          role: c.role, active: c.active, pin_hash_prefix: c.pin_hash_prefix,
        })));
      } catch {
        setCashiers(await db.cashiers.toArray());
      }
    })();
  }, []);

  async function submit() {
    if (!selected) return;
    setErr(null);
    try {
      await verifyCashierPin(selected.id, pin);
      signIn({ cashier_id: selected.id, cashier_name: selected.name, role: selected.role });
    } catch {
      setErr('Bad PIN — try again');
      setPin('');
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <h1>Sign in</h1>
      {!selected && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {cashiers.map((c) => (
            <li key={c.id}>
              <button onClick={() => setSelected(c)} style={{ width: '100%', textAlign: 'left', padding: 12, margin: '4px 0' }}>
                {c.name} <span style={{ color: 'var(--muted)' }}>· {c.role}</span>
              </button>
            </li>
          ))}
          {cashiers.length === 0 && <li style={{ color: 'var(--muted)' }}>No cashiers found.</li>}
        </ul>
      )}
      {selected && (
        <div>
          <p>Hello {selected.name}, enter your PIN:</p>
          <input type="password" inputMode="numeric" value={pin}
                 onChange={(e) => setPin(e.target.value)} autoFocus
                 onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <button onClick={submit} disabled={!pin}>Sign in</button>
          <button onClick={() => { setSelected(null); setPin(''); }}>Back</button>
          {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
        </div>
      )}
    </main>
  );
}
