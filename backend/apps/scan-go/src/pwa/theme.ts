export type ThemeName = 'dark' | 'light';

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export async function resolveStoredTheme(): Promise<void> {
  const stored = localStorage.getItem('scango_theme') as ThemeName | null;
  applyTheme(stored ?? 'light');
}
