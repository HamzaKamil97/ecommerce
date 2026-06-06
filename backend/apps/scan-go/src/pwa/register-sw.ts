import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('A new Scan & Go version is available. Reload now?')) updateSW(true);
    },
    onOfflineReady() {
      // eslint-disable-next-line no-console
      console.log('[scan-go] offline-ready');
    },
  });
}
