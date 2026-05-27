import { describe, it, expect, beforeEach } from 'vitest';
import { useTheme, deriveAutoTheme } from '../src/state/theme';

describe('theme store', () => {
  beforeEach(() => useTheme.getState().reset());

  it('default is light', () => {
    expect(useTheme.getState().theme).toBe('light');
    expect(useTheme.getState().autoMode).toBe(false);
  });

  it('setTheme changes the theme', () => {
    useTheme.getState().setTheme('dark');
    expect(useTheme.getState().theme).toBe('dark');
  });

  it('deriveAutoTheme returns dark for hour >= 18 or < 6', () => {
    expect(deriveAutoTheme(new Date('2026-05-27T18:30:00'))).toBe('dark');
    expect(deriveAutoTheme(new Date('2026-05-27T23:00:00'))).toBe('dark');
    expect(deriveAutoTheme(new Date('2026-05-27T05:30:00'))).toBe('dark');
    expect(deriveAutoTheme(new Date('2026-05-27T12:00:00'))).toBe('light');
    expect(deriveAutoTheme(new Date('2026-05-27T06:00:00'))).toBe('light');
    expect(deriveAutoTheme(new Date('2026-05-27T17:59:00'))).toBe('light');
  });

  it('setAutoMode(true) immediately applies the auto-derived theme', () => {
    useTheme.getState().setAutoMode(true);
    expect(useTheme.getState().autoMode).toBe(true);
    expect(['light', 'dark']).toContain(useTheme.getState().theme);
  });

  it('tick updates theme when autoMode is on', () => {
    useTheme.getState().setAutoMode(true);
    useTheme.getState().tick(new Date('2026-05-27T19:00:00'));
    expect(useTheme.getState().theme).toBe('dark');
    useTheme.getState().tick(new Date('2026-05-27T12:00:00'));
    expect(useTheme.getState().theme).toBe('light');
  });

  it('tick is a no-op when autoMode is off', () => {
    useTheme.getState().setTheme('light');
    useTheme.getState().tick(new Date('2026-05-27T22:00:00'));
    expect(useTheme.getState().theme).toBe('light');
  });

  it('manual setTheme disables autoMode', () => {
    useTheme.getState().setAutoMode(true);
    expect(useTheme.getState().autoMode).toBe(true);
    useTheme.getState().setTheme('light');
    expect(useTheme.getState().autoMode).toBe(false);
  });

  it('applyTheme sets data-theme on documentElement', async () => {
    const { applyTheme } = await import('../src/state/theme');
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
