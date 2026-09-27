import { createBrowserRouter, Outlet } from 'react-router-dom';

import App from '../app';

import Dashboard from '../pages/dashboard/dashboard';
import Analyze from '../pages/analyze/analyze';
import Transform from '../pages/transform/transform';
import Settings from '../pages/settings/settings';
import Developers from '../pages/developers/developers';

import Login from '../pages/login/login';
import Signup from '../pages/signup/signup';

import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../context/auth-context';

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },

      {
        path: '/signup',
        element: <Signup />,
      },

      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/',
            element: <App />,
            children: [
              {
                index: true,
                element: <Dashboard />,
              },
              {
                path: 'analyze',
                element: <Analyze />,
              },
              {
                path: 'transform',
                element: <Transform />,
              },
              {
                path: 'api-keys',
                element: <Developers />,
              },
              {
                path: 'settings',
                element: <Settings />,
              },
            ],
          },
        ],
      },
    ],
  },
]);