import { api } from './client';

export type Me = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_super_admin: boolean;
};

export async function fetchMe(): Promise<Me> {
  const r = await api<{ user: Me }>('/admin/users/me');
  return r.user;
}
