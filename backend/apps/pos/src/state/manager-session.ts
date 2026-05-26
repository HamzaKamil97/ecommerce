import { create } from 'zustand';

export type ManagerSession = {
  manager_id: string | null;
  manager_name: string | null;
  signIn: (s: { manager_id: string; manager_name: string }) => void;
  signOut: () => void;
};

export const useManagerSession = create<ManagerSession>((set) => ({
  manager_id: null, manager_name: null,
  signIn({ manager_id, manager_name }) { set({ manager_id, manager_name }); },
  signOut() { set({ manager_id: null, manager_name: null }); },
}));
