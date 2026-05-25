import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('A new PoS version is available. Reload now?')) updateSW(true);
    },
    onOfflineReady() {
      // eslint-disable-next-line no-console
      console.log('[pos] offline-ready');
    },
  });
}
