import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Session = {
  cashier_id: string | null;
  cashier_name: string | null;
  role: 'cashier' | 'manager' | null;
  signIn: (s: { cashier_id: string; cashier_name: string; role: 'cashier' | 'manager' }) => void;
  signOut: () => void;
};

export const useSession = create<Session>()(
  persist(
    (set) => ({
      cashier_id: null, cashier_name: null, role: null,
      signIn({ cashier_id, cashier_name, role }) { set({ cashier_id, cashier_name, role }); },
      signOut() { set({ cashier_id: null, cashier_name: null, role: null }); },
    }),
    {
      name: 'hanoot.session',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ cashier_id: s.cashier_id, cashier_name: s.cashier_name, role: s.role }),
    },
  ),
);
