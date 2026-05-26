import { db } from '../db/dexie';

export type ThemeName = 'dark' | 'light';

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export async function resolveStoredTheme(): Promise<void> {
  const row = await db.config.get('app');
  const persisted = (row?.value as { theme?: ThemeName } | undefined);
  applyTheme(persisted?.theme ?? 'dark');
}
