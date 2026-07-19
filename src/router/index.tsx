import { createBrowserRouter } from 'react-router-dom';
import App from '../app';
import Dashboard from '../pages/dashboard/dashboard';
import Analyze from '../pages/analyze/analyze';
import Transform from '../pages/transform/transform';
import Settings from '../pages/settings/settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'analyze', element: <Analyze /> },
      { path: 'transform', element: <Transform /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);
