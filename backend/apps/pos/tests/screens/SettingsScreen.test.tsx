import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsScreen } from '../../src/ui/screens/SettingsScreen';
import { useTheme } from '../../src/state/theme';

describe('SettingsScreen v2', () => {
  beforeEach(() => {
    useTheme.getState().reset();
    try {
      localStorage.clear();
    } catch {
      /* jsdom */
    }
  });

  it('renders the four section headings', () => {
    render(<SettingsScreen onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /Appearance/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Hardware/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Operations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Quick-buttons/i })).toBeInTheDocument();
  });

  it('theme picker reads from useTheme and flips to dark on click', () => {
    useTheme.getState().setTheme('light');
    render(<SettingsScreen onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Dark/i }));
    expect(useTheme.getState().theme).toBe('dark');
  });

  it('theme picker flips back to light', () => {
    useTheme.getState().setTheme('dark');
    render(<SettingsScreen onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Light/i }));
    expect(useTheme.getState().theme).toBe('light');
  });

  it('auto-dark toggle flips autoMode', () => {
    expect(useTheme.getState().autoMode).toBe(false);
    render(<SettingsScreen onClose={() => {}} />);
    fireEvent.click(screen.getByRole('switch', { name: /Auto-dark/i }));
    expect(useTheme.getState().autoMode).toBe(true);
  });

  it('renders all 4 hardware chips', () => {
    render(<SettingsScreen onClose={() => {}} />);
    expect(screen.getByText(/Receipt printer/i)).toBeInTheDocument();
    expect(screen.getByText(/Barcode scanner/i)).toBeInTheDocument();
    expect(screen.getByText(/Cash drawer/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer display/i)).toBeInTheDocument();
  });

  it('back chevron calls onClose', () => {
    const onClose = vi.fn();
    render(<SettingsScreen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /back|←/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
