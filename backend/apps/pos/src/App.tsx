import { useEffect } from 'react';
import { useSession } from './state/session';
import { LoginScreen } from './ui/screens/LoginScreen';
import { RegisterScreen } from './ui/screens/RegisterScreen';
import { attachNetworkListeners, startBackgroundSync, stopBackgroundSync } from './sync/sync-client';

export default function App() {
  const cashier_id = useSession((s) => s.cashier_id);

  useEffect(() => {
    attachNetworkListeners();
    startBackgroundSync(5000);
    return () => stopBackgroundSync();
  }, []);

  if (!cashier_id) return <LoginScreen />;
  return <RegisterScreen />;
}
