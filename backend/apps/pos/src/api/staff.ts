// listStaff reads the live cashier roster from the pos_terminal module.
// NOTE: GET /admin/pos-terminal/cashiers does NOT return permission_overrides or
// last_active_at — those aren't exposed by the cashier list. We default
// permission_overrides to {} so PinResetScreen.resolveLabel (which dereferences
// row.permission_overrides[key]) renders role-default pills without crashing.
// resetPin still targets /admin/staff/:id/reset-pin — that endpoint is built in
// Pass 2 (POST /admin/pos-terminal/cashiers/:id/reset-pin); the reset action
// 404s until then.

import { apiGet, apiPost } from './client';

export type StaffRow = {
  id: string;
  vendor_id: string;
  name: string;
  role: 'owner' | 'manager' | 'cashier' | 'data_entry' | 'picker';
  permission_overrides: Record<string, true | false>;
  last_active_at?: string | null;
};

type Cashier = {
  id: string;
  vendor_id: string;
  name: string;
  role: StaffRow['role'];
  active?: boolean;
  pin_hash_prefix?: string;
};

export async function listStaff(vendorId: string): Promise<StaffRow[]> {
  const r = await apiGet<{ cashiers?: Cashier[] }>(
    `/admin/pos-terminal/cashiers?vendor_id=${encodeURIComponent(vendorId)}`,
  );
  return (r.cashiers ?? []).map((c) => ({
    id: c.id,
    vendor_id: c.vendor_id,
    name: c.name,
    role: c.role,
    permission_overrides: {},
    last_active_at: null,
  }));
}

export async function resetPin(id: string, pin: string): Promise<{ ok: boolean }> {
  return apiPost(`/admin/staff/${encodeURIComponent(id)}/reset-pin`, { pin });
}
