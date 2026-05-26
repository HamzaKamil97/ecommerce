import { API_BASE } from '../env';
import { getDevAdminToken } from './dev-auth';

export class ApiError extends Error {
  constructor(public status: number, public payload: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getDevAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body, (body as any)?.error ?? res.statusText);
  return body as T;
}
