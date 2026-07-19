import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProvider } from './context/app-context';
import { ToastProvider } from './context/toast-context';
import { router } from './router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AppProvider>
  </StrictMode>,
);
