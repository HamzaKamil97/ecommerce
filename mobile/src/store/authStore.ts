import { create } from 'zustand';
import * as authApi from '../api/auth';
import type { Customer } from '../api/auth';

interface AuthState {
  customer: Customer | null;
  isLoading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  customer: null,
  isLoading: false,
  initialized: false,
  init: async () => {
    set({ isLoading: true });
    const customer = await authApi.me();
    set({ customer, initialized: true, isLoading: false });
  },
  login: async (email, password) => {
    set({ isLoading: true });
    const customer = await authApi.login(email, password);
    set({ customer, isLoading: false });
  },
  register: async (params) => {
    set({ isLoading: true });
    const customer = await authApi.register(params);
    set({ customer, isLoading: false });
  },
  logout: async () => {
    await authApi.logout();
    set({ customer: null });
  },
}));
