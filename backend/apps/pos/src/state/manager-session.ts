import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ManagerSession = {
  manager_id: string | null;
  manager_name: string | null;
  signIn: (s: { manager_id: string; manager_name: string }) => void;
  signOut: () => void;
};

// sessionStorage (NOT localStorage): manager back-office access must not survive a browser restart without re-PIN.
export const useManagerSession = create<ManagerSession>()(
  persist(
    (set) => ({
      manager_id: null, manager_name: null,
      signIn({ manager_id, manager_name }) { set({ manager_id, manager_name }); },
      signOut() { set({ manager_id: null, manager_name: null }); },
    }),
    {
      name: 'hanoot.manager-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ manager_id: s.manager_id, manager_name: s.manager_name }),
    },
  ),
);
