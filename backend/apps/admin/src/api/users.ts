// backend/apps/admin/src/api/users.ts
import { api } from './client';

export type Me = {
  id: string;
  email: string;
  is_super_admin: boolean;
};

export async function fetchMe(): Promise<Me> {
  const r = await api<{ user: Me }>('/admin/super-admin/me');
  return r.user;
}
