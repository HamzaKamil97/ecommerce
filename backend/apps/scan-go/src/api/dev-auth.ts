import { API_BASE } from '../env';

/**
 * DEV-ONLY admin auth shim. Reads VITE_DEV_ADMIN_EMAIL/PASSWORD from .env at
 * startup, exchanges them for a Medusa admin JWT once, memoizes the promise.
 *
 * NOT a production auth model. Real per-vendor scoped tokens live in H-3.1.
 * If the env vars are absent the function resolves to null and the api()
 * wrapper sends no Authorization header (matching prior behavior).
 */
let tokenPromise: Promise<string | null> | null = null;

export function getDevAdminToken(): Promise<string | null> {
  if (tokenPromise) return tokenPromise;
  tokenPromise = (async () => {
    // Vitest sets MODE='test'; skip dev-auth so tests don't see extra fetch calls.
    if (import.meta.env.MODE === 'test') return null;
    const email = import.meta.env.VITE_DEV_ADMIN_EMAIL as string | undefined;
    const password = import.meta.env.VITE_DEV_ADMIN_PASSWORD as string | undefined;
    if (!email || !password) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/user/emailpass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return null;
      const json: any = await res.json();
      return (json?.token as string) ?? null;
    } catch {
      return null;
    }
  })();
  return tokenPromise;
}

export function resetDevAdminTokenForTests(): void {
  tokenPromise = null;
}
