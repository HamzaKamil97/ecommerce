import { create } from 'zustand';

type Net = {
  online: boolean;
  queueDepth: number;
  setOnline: (v: boolean) => void;
  setQueueDepth: (n: number) => void;
};

export const useNet = create<Net>((set) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  queueDepth: 0,
  setOnline(v) { set({ online: v }); },
  setQueueDepth(n) { set({ queueDepth: n }); },
}));

export function attachNetworkListeners() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => useNet.getState().setOnline(true));
  window.addEventListener('offline', () => useNet.getState().setOnline(false));
}
