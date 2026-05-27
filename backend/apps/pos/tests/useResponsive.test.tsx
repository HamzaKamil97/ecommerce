import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsive } from '../src/hooks/useResponsive';

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
  window.dispatchEvent(new Event('resize'));
}

describe('useResponsive', () => {
  beforeEach(() => setViewport(1024));

  it('returns phone for width < 768', () => {
    setViewport(375);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.kind).toBe('phone');
    expect(result.current.isPhone).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('returns tablet for 768 <= width < 1024', () => {
    setViewport(900);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.kind).toBe('tablet');
    expect(result.current.isTablet).toBe(true);
  });

  it('boundary: width = 768 is tablet, not phone', () => {
    setViewport(768);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.kind).toBe('tablet');
  });

  it('returns desktop for 1024 <= width < 1440', () => {
    setViewport(1280);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.kind).toBe('desktop');
    expect(result.current.isDesktop).toBe(true);
  });

  it('boundary: width = 1024 is desktop, not tablet', () => {
    setViewport(1024);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.kind).toBe('desktop');
  });

  it('returns wide for width >= 1440', () => {
    setViewport(1600);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.kind).toBe('wide');
    expect(result.current.isDesktop).toBe(true);
  });

  it('reacts to resize event', () => {
    setViewport(900);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.kind).toBe('tablet');
    act(() => setViewport(375));
    expect(result.current.kind).toBe('phone');
    act(() => setViewport(1280));
    expect(result.current.kind).toBe('desktop');
  });

  it('returns the width as a number', () => {
    setViewport(800);
    const { result } = renderHook(() => useResponsive());
    expect(typeof result.current.width).toBe('number');
    expect(result.current.width).toBe(800);
  });
});
