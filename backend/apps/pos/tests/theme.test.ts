import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme, resolveStoredTheme } from '../src/pwa/theme';
import { saveConfig, defaultConfig } from '../src/state/config';
import { resetDbForTests } from '../src/db/dexie';

describe('theme', () => {
  beforeEach(async () => {
    await resetDbForTests();
    document.documentElement.removeAttribute('data-theme');
  });

  it('applyTheme writes data-theme attribute on documentElement', () => {
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('resolveStoredTheme reads the persisted config and applies it', async () => {
    await saveConfig({ ...defaultConfig, theme: 'light' });
    await resolveStoredTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
