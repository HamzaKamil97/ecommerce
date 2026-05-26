import { useEffect } from 'react';
import {
  attachNetworkListeners, startBackgroundSync, stopBackgroundSync, resetStuckSendingRows,
} from './sync/sync-client';
import { AppRouter } from './routes';

export default function App() {
  useEffect(() => {
    resetStuckSendingRows().catch(() => {});
    attachNetworkListeners();
    startBackgroundSync(5000);
    return () => stopBackgroundSync();
  }, []);
  return <AppRouter />;
}
