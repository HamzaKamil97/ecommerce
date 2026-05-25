import { describe, it, expect, beforeEach } from 'vitest';
import { resetDbForTests } from '../src/db/dexie';
import { loadConfig, saveConfig, defaultConfig } from '../src/state/config';

describe('config store', () => {
  beforeEach(async () => { await resetDbForTests(); });

  it('returns default when no config in Dexie', async () => {
    const c = await loadConfig();
    expect(c.theme).toBe('dark');
    expect(c.quick_buttons).toEqual([]);
  });

  it('persists + reads quick buttons', async () => {
    await saveConfig({ ...defaultConfig, quick_buttons: [
      { variant_id: 'v_1', label: 'Bread', color: '#21d07a' },
      { variant_id: 'v_2', label: 'Milk',  color: '#2196f3' },
    ]});
    const c = await loadConfig();
    expect(c.quick_buttons).toHaveLength(2);
    expect(c.quick_buttons[0]!.label).toBe('Bread');
  });

  it('toggles theme to light + back', async () => {
    await saveConfig({ ...defaultConfig, theme: 'light' });
    expect((await loadConfig()).theme).toBe('light');
    await saveConfig({ ...defaultConfig, theme: 'dark' });
    expect((await loadConfig()).theme).toBe('dark');
  });
});
