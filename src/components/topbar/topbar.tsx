import { Search, Bell, LogOut, User } from 'lucide-react';
import { useApp } from '../../context/app-context';
import Breadcrumbs from '../breadcrumbs/breadcrumbs';
import Dropdown from '../ui/dropdown';
import styles from './topbar.module.css';

export default function Topbar() {
  const { toggleCommandPalette, state } = useApp();

  const userMenuItems = [
    { id: 'profile', label: state.settings.displayName, icon: <User size={14} /> },
    { id: 'sep', label: '', separator: true },
    { id: 'logout', label: 'Sign out', icon: <LogOut size={14} /> },
  ];

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <Breadcrumbs />
      </div>

      <div className={styles.center}>
        <button className={styles.searchTrigger} onClick={toggleCommandPalette}>
          <Search size={14} />
          <span>Search…</span>
          <span className={styles.searchShortcut}>⌘K</span>
        </button>
      </div>

      <div className={styles.right}>
        <button className={styles.iconBtn} title="Notifications">
          <Bell size={16} strokeWidth={1.8} />
        </button>

        <Dropdown
          trigger={
            <div className={styles.avatar}>
              {state.settings.displayName.charAt(0).toUpperCase()}
            </div>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
}
