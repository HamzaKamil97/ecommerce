import { create } from 'zustand';

type SpotlightState = {
  open: boolean;
  query: string;
  setQuery: (q: string) => void;
  openSpotlight: () => void;
  closeSpotlight: () => void;
};

export const useSpotlight = create<SpotlightState>((set) => ({
  open: false,
  query: '',
  setQuery: (q) => set({ query: q }),
  openSpotlight: () => set({ open: true }),
  closeSpotlight: () => set({ open: false, query: '' }),
}));
