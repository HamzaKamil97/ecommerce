import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { RegisterScreen } from './ui/screens/RegisterScreen';
import { LoginScreen } from './ui/screens/LoginScreen';
import { ManagerLayout } from './ui/screens/manager/ManagerLayout';
import { ManagerPinGate } from './ui/screens/manager/ManagerPinGate';
import { CatalogListScreen } from './ui/screens/manager/CatalogListScreen';
import { AddProductSearchScreen } from './ui/screens/manager/AddProductSearchScreen';
import { AddProductScreen } from './ui/screens/manager/AddProductScreen';
import { DepartmentsScreen } from './ui/screens/manager/DepartmentsScreen';
import { TagsScreen } from './ui/screens/manager/TagsScreen';
import { CsvImportScreen } from './ui/screens/manager/CsvImportScreen';
import { ApprovalsTrayScreen } from './ui/screens/manager/ApprovalsTrayScreen';
import { PinResetScreen } from './ui/screens/manager/PinResetScreen';
import { AuditLogScreen } from './ui/screens/manager/AuditLogScreen';
import { OrderInboxScreen } from './ui/screens/OrderInboxScreen';
import { OrderDetailScreen } from './ui/screens/OrderDetailScreen';
import { EndOfDayScreen } from './ui/screens/EndOfDayScreen';
import { StockCountScreen } from './ui/screens/StockCountScreen';
import { RefundFlowPhone } from './ui/screens/refund/RefundFlowPhone';
import { RefundScreen } from './ui/screens/refund/RefundScreen';
import { useResponsive } from './hooks/useResponsive';
import { useSession } from './state/session';

function RequireCashier({ children }: { children: React.ReactNode }) {
  const id = useSession((s) => s.cashier_id);
  return id ? <>{children}</> : <LoginScreen />;
}

function ResponsiveRefund() {
  const { isPhone } = useResponsive();
  return isPhone
    ? <RefundFlowPhone onClose={() => window.history.back()} />
    : <RefundScreen onClose={() => window.history.back()} />;
}

export const router = createBrowserRouter([
  { path: '/', element: <RequireCashier><RegisterScreen /></RequireCashier> },
  { path: '/orders', element: <RequireCashier><OrderInboxScreen /></RequireCashier> },
  { path: '/orders/:id', element: <RequireCashier><OrderDetailScreen /></RequireCashier> },
  { path: '/refund', element: <RequireCashier><ResponsiveRefund /></RequireCashier> },
  {
    path: '/end-of-day',
    element: <RequireCashier><EndOfDayScreen onClose={() => window.history.back()} /></RequireCashier>,
  },
  {
    path: '/stock-count',
    element: (
      <RequireCashier>
        <ManagerPinGate>
          <StockCountScreen onClose={() => window.history.back()} />
        </ManagerPinGate>
      </RequireCashier>
    ),
  },
  {
    path: '/manager',
    element: <RequireCashier><ManagerPinGate><ManagerLayout /></ManagerPinGate></RequireCashier>,
    children: [
      { index: true, element: <Navigate to="catalog" replace /> },
      { path: 'catalog', element: <CatalogListScreen /> },
      { path: 'catalog/search', element: <AddProductSearchScreen /> },
      { path: 'catalog/new', element: <AddProductScreen /> },
      { path: 'departments', element: <DepartmentsScreen /> },
      { path: 'tags', element: <TagsScreen /> },
      { path: 'import', element: <CsvImportScreen /> },
      { path: 'approvals', element: <ApprovalsTrayScreen /> },
      { path: 'pin-reset', element: <PinResetScreen /> },
      { path: 'audit-log', element: <AuditLogScreen /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
