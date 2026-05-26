import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { RegisterScreen } from './ui/screens/RegisterScreen';
import { LoginScreen } from './ui/screens/LoginScreen';
import { ManagerLayout } from './ui/screens/manager/ManagerLayout';
import { ManagerPinGate } from './ui/screens/manager/ManagerPinGate';
import { CatalogListScreen } from './ui/screens/manager/CatalogListScreen';
import { AddProductScreen } from './ui/screens/manager/AddProductScreen';
import { CsvImportScreen } from './ui/screens/manager/CsvImportScreen';
import { useSession } from './state/session';

function RequireCashier({ children }: { children: React.ReactNode }) {
  const id = useSession((s) => s.cashier_id);
  return id ? <>{children}</> : <LoginScreen />;
}

export const router = createBrowserRouter([
  { path: '/', element: <RequireCashier><RegisterScreen /></RequireCashier> },
  {
    path: '/manager',
    element: <RequireCashier><ManagerPinGate><ManagerLayout /></ManagerPinGate></RequireCashier>,
    children: [
      { index: true, element: <Navigate to="catalog" replace /> },
      { path: 'catalog', element: <CatalogListScreen /> },
      { path: 'catalog/new', element: <AddProductScreen /> },
      { path: 'import', element: <CsvImportScreen /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
