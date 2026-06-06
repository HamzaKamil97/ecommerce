import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginScreen } from './ui/screens/LoginScreen';
import { ScanScreen } from './ui/screens/ScanScreen';
import { SearchScreen } from './ui/screens/SearchScreen';
import { CartReviewScreen } from './ui/screens/CartReviewScreen';
import { CodeScreen } from './ui/screens/CodeScreen';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginScreen /> },
  { path: '/', element: <ScanScreen /> },
  { path: '/search', element: <SearchScreen /> },
  { path: '/cart', element: <CartReviewScreen /> },
  { path: '/code/:id', element: <CodeScreen /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
