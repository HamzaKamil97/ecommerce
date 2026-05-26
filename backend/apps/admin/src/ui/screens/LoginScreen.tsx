import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, VENDOR_ID } from '../../env';
import { useAdminSession } from '../../state/session';

export function LoginScreen() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vendor, setVendor] = useState(VENDOR_ID);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/auth/user/emailpass`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.token) throw new Error(json?.message ?? 'login failed');
      useAdminSession.getState().signIn(json.token, vendor);
      nav('/');
    } catch (e: any) { setErr(e?.message ?? 'login failed'); }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: '64px auto' }}>
      <h1>Hanoot Admin</h1>
      <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label>Vendor ID<input value={vendor} onChange={(e) => setVendor(e.target.value)} /></label>
      <button onClick={submit}>Sign in</button>
      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
    </main>
  );
}
