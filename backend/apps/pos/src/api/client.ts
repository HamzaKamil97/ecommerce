import { API_BASE } from '../env';

export class ApiError extends Error {
  constructor(public status: number, public payload: unknown, message: string) { super(message); }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body, (body as any)?.error ?? res.statusText);
  return body as T;
}
