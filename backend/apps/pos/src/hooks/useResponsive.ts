import { useSyncExternalStore } from 'react';

export type Breakpoint = 'phone' | 'tablet' | 'desktop' | 'wide';

function getKind(width: number): Breakpoint {
  if (width < 768) return 'phone';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'desktop';
  return 'wide';
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
}

function getSnapshot(): number {
  return window.innerWidth;
}

function getServerSnapshot(): number {
  // SSR default — desktop-class so layouts don't collapse
  return 1024;
}

export function useResponsive() {
  const width = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const kind = getKind(width);
  return {
    width,
    kind,
    isPhone: kind === 'phone',
    isTablet: kind === 'tablet',
    isDesktop: kind === 'desktop' || kind === 'wide',
  };
}
