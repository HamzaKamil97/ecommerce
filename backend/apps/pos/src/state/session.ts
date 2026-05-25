import { create } from 'zustand';

export type Session = {
  cashier_id: string | null;
  cashier_name: string | null;
  role: 'cashier' | 'manager' | null;
  signIn: (s: { cashier_id: string; cashier_name: string; role: 'cashier' | 'manager' }) => void;
  signOut: () => void;
};

export const useSession = create<Session>((set) => ({
  cashier_id: null, cashier_name: null, role: null,
  signIn({ cashier_id, cashier_name, role }) { set({ cashier_id, cashier_name, role }); },
  signOut() { set({ cashier_id: null, cashier_name: null, role: null }); },
}));
