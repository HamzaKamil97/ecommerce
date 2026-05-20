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
    phone?: string;
  }) => Promise<void>;
  updateProfile: (params: { first_name?: string; last_name?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  customer: null,
  isLoading: false,
  initialized: false,
  init: async () => {
    set({ isLoading: true });
    try {
      const customer = await authApi.me();
      set({ customer, initialized: true });
    } catch {
      set({ initialized: true });
    } finally {
      set({ isLoading: false });
    }
  },
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const customer = await authApi.login(email, password);
      set({ customer });
    } finally {
      set({ isLoading: false });
    }
  },
  register: async (params) => {
    set({ isLoading: true });
    try {
      const customer = await authApi.register(params);
      set({ customer });
    } finally {
      set({ isLoading: false });
    }
  },
  updateProfile: async (params) => {
    set({ isLoading: true });
    try {
      const customer = await authApi.updateMe(params);
      set({ customer });
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ customer: null });
    }
  },
}));
