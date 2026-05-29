// NOTE: /admin/staff and /admin/staff/:id/reset-pin may not exist yet this phase
// — this screen is exercised via mocks; the unit test is the acceptance gate.

import { apiGet, apiPost } from './client';

export type StaffRow = {
  id: string;
  vendor_id: string;
  name: string;
  role: 'owner' | 'manager' | 'cashier' | 'data_entry' | 'picker';
  permission_overrides: Record<string, true | false>;
  last_active_at?: string | null;
};

export async function listStaff(vendorId: string): Promise<StaffRow[]> {
  const r = await apiGet<any>(`/admin/staff?vendor_id=${encodeURIComponent(vendorId)}`);
  return r.staff ?? r.rows ?? [];
}

export async function resetPin(id: string, pin: string): Promise<{ ok: boolean }> {
  return apiPost(`/admin/staff/${encodeURIComponent(id)}/reset-pin`, { pin });
}
