import { create } from 'zustand';
type S = { token: string | null; vendor_id: string; signIn: (t: string, v: string) => void; signOut: () => void };
export const useAdminSession = create<S>((set) => ({
  token: null, vendor_id: '',
  signIn(token, vendor_id) { set({ token, vendor_id }); },
  signOut() { set({ token: null, vendor_id: '' }); },
}));
