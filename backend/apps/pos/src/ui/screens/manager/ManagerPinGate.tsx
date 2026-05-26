import { useEffect, useState } from 'react';
import { fetchCashiers, verifyCashierPin, type CashierListItem } from '../../../api/pos';
import { VENDOR_ID } from '../../../env';
import { useManagerSession } from '../../../state/manager-session';

export function ManagerPinGate({ children }: { children: React.ReactNode }) {
  const manager_id = useManagerSession((s) => s.manager_id);
  const [cashiers, setCashiers] = useState<CashierListItem[]>([]);
  const [picked, setPicked] = useState<CashierListItem | null>(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchCashiers(VENDOR_ID).then(setCashiers).catch(() => setCashiers([]));
  }, []);

  if (manager_id) return <>{children}</>;

  async function submit() {
    if (!picked) return;
    setBusy(true); setErr(null);
    try {
      const v = await verifyCashierPin(picked.id, pin);
      if (v.role !== 'manager') { setErr('manager role required'); setBusy(false); return; }
      useManagerSession.getState().signIn({ manager_id: v.id, manager_name: v.name });
    } catch (e: any) {
      setErr(e?.message ?? 'verify failed');
    } finally { setBusy(false); }
  }

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <h1>Manager mode</h1>
      {!picked ? (
        <>
          <p>Pick your manager profile:</p>
          <ul>
            {cashiers.map((c) => (
              <li key={c.id}>
                <button onClick={() => setPicked(c)}>{c.name}</button>
              </li>
            ))}
          </ul>
          {!cashiers.length && <p>No cashiers found — create one in Admin first.</p>}
        </>
      ) : (
        <>
          <p>Signing in as <strong>{picked.name}</strong></p>
          <label>PIN
            <input aria-label="PIN" type="password" value={pin}
              onChange={(e) => setPin(e.target.value)} autoFocus />
          </label>
          <button onClick={submit} disabled={busy}>Unlock</button>
          <button onClick={() => { setPicked(null); setPin(''); setErr(null); }}>Back</button>
          {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
        </>
      )}
    </main>
  );
}
