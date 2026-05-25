import { useSession } from './state/session';
import { LoginScreen } from './ui/screens/LoginScreen';
import { RegisterScreen } from './ui/screens/RegisterScreen';

export default function App() {
  const cashier_id = useSession((s) => s.cashier_id);
  if (!cashier_id) return <LoginScreen />;
  return <RegisterScreen />;
}
