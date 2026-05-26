import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from './ui/screens/LoginScreen';
import { DashboardScreen } from './ui/screens/DashboardScreen';
import { LockedShell } from './ui/screens/super-admin/LockedShell';
import { useAdminSession } from './state/session';
import { fetchMe } from './api/users';

function Guarded({ children }: { children: React.ReactNode }) {
  const token = useAdminSession((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function SuperAdminGuarded({ children }: { children: React.ReactNode }) {
  const isSuperAdmin = useAdminSession((s) => s.is_super_admin);
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function SessionHydrator() {
  const token = useAdminSession((s) => s.token);
  useEffect(() => {
    if (!token) return;
    fetchMe()
      .then((me) => useAdminSession.getState().setSuperAdmin(!!me.is_super_admin))
      .catch(() => {});
  }, [token]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionHydrator />
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/" element={<Guarded><DashboardScreen /></Guarded>} />
        <Route path="/super-admin/shops" element={<Guarded><SuperAdminGuarded><LockedShell title="All shops" comingIn="shop #2 onboards" /></SuperAdminGuarded></Guarded>} />
        <Route path="/super-admin/alerts" element={<Guarded><SuperAdminGuarded><LockedShell title="Platform alerts" comingIn="shop #2 onboards" /></SuperAdminGuarded></Guarded>} />
        <Route path="/super-admin/revenue" element={<Guarded><SuperAdminGuarded><LockedShell title="Revenue & commission" comingIn="shop #2 onboards" /></SuperAdminGuarded></Guarded>} />
        <Route path="/super-admin/audit" element={<Guarded><SuperAdminGuarded><LockedShell title="Activity log" comingIn="shop #2 onboards" /></SuperAdminGuarded></Guarded>} />
        <Route path="/super-admin/onboard" element={<Guarded><SuperAdminGuarded><LockedShell title="Onboard vendor" comingIn="shop #2 onboards" /></SuperAdminGuarded></Guarded>} />
      </Routes>
    </BrowserRouter>
  );
}
