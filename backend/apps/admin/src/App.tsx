import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from './ui/screens/LoginScreen';
import { DashboardScreen } from './ui/screens/DashboardScreen';
import { useAdminSession } from './state/session';

function Guarded({ children }: { children: React.ReactNode }) {
  const token = useAdminSession((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/" element={<Guarded><DashboardScreen /></Guarded>} />
      </Routes>
    </BrowserRouter>
  );
}
