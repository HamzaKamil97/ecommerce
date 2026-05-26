import { loadConfig } from '../state/config';

export type ThemeName = 'dark' | 'light';

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export async function resolveStoredTheme(): Promise<void> {
  const cfg = await loadConfig();
  applyTheme(cfg.theme);
}
