import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useApp } from './context/app-context';
import Sidebar from './components/sidebar/sidebar';
import Topbar from './components/topbar/topbar';
import CommandPalette from './components/command-palette/command-palette';
import ToastContainer from './components/toast/toast';
import styles from './app.module.css';

export default function App() {
  const { state } = useApp();

  useEffect(() => {
    const theme = state.settings.theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [state.settings.theme]);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={`${styles.main} ${state.sidebarCollapsed ? styles.mainCollapsed : ''}`}>
        <Topbar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
      <CommandPalette />
      <ToastContainer />
    </div>
  );
}
