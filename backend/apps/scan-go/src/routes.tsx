import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginScreen } from './ui/screens/LoginScreen';
import { HomeScreen } from './ui/screens/HomeScreen';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginScreen /> },
  { path: '/', element: <HomeScreen /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
