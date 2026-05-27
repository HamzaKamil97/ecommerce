import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const DARK_HOUR_START = 18;  // 18:00 onward → dark
const DARK_HOUR_END = 6;     // before 06:00 → still dark

export function deriveAutoTheme(now: Date): Theme {
  const h = now.getHours();
  return (h >= DARK_HOUR_START || h < DARK_HOUR_END) ? 'dark' : 'light';
}

type ThemeState = {
  theme: Theme;
  autoMode: boolean;
  setTheme: (t: Theme) => void;
  setAutoMode: (on: boolean) => void;
  tick: (now?: Date) => void;
  reset: () => void;
};

export const useTheme = create<ThemeState>((set, get) => ({
  theme: 'light',
  autoMode: false,
  setTheme: (t) => set({ theme: t, autoMode: false }),
  setAutoMode: (on) =>
    set((s) => ({ autoMode: on, theme: on ? deriveAutoTheme(new Date()) : s.theme })),
  tick: (now = new Date()) => {
    if (!get().autoMode) return;
    set({ theme: deriveAutoTheme(now) });
  },
  reset: () => set({ theme: 'light', autoMode: false }),
}));

/**
 * Side-effect helper: apply the active theme to documentElement by setting
 * data-theme. CSS in tokens.css selects on [data-theme='dark'] to invert
 * the palette. Call from App.tsx on mount + subscribe to changes.
 */
export function applyTheme(t: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = t;
}
