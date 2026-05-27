import { useEffect } from 'react';
import {
  attachNetworkListeners, startBackgroundSync, stopBackgroundSync, resetStuckSendingRows,
} from './sync/sync-client';
import { useTheme, applyTheme } from './state/theme';
import { AppRouter } from './routes';

export default function App() {
  useEffect(() => {
    resetStuckSendingRows().catch(() => {});
    attachNetworkListeners();
    startBackgroundSync(5000);
    return () => stopBackgroundSync();
  }, []);

  useEffect(() => {
    // Apply current theme + subscribe to changes
    applyTheme(useTheme.getState().theme);
    const unsub = useTheme.subscribe((s) => applyTheme(s.theme));

    // Tick once on mount in case we already crossed the dark threshold
    useTheme.getState().tick();
    // Then check every minute for the auto-dark window
    const id = window.setInterval(() => useTheme.getState().tick(), 60_000);

    return () => {
      unsub();
      clearInterval(id);
    };
  }, []);

  return <AppRouter />;
}
