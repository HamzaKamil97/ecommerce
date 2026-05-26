import { create } from 'zustand';

type S = {
  token: string | null;
  vendor_id: string;
  is_super_admin: boolean;
  signIn: (t: string, v: string) => void;
  signOut: () => void;
  setSuperAdmin: (v: boolean) => void;
};

export const useAdminSession = create<S>((set) => ({
  token: null, vendor_id: '', is_super_admin: false,
  signIn(token, vendor_id) { set({ token, vendor_id }); },
  signOut() { set({ token: null, vendor_id: '', is_super_admin: false }); },
  setSuperAdmin(v) { set({ is_super_admin: v }); },
}));
