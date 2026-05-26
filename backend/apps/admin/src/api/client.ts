import { API_BASE } from '../env';
import { useAdminSession } from '../state/session';
export class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAdminSession.getState().token;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (body as any)?.error ?? res.statusText);
  return body as T;
}
