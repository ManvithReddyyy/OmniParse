import { Search, Bell, LogOut, User, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/app-context';
import { useAuth } from '../../context/auth-context';
import Breadcrumbs from '../breadcrumbs/breadcrumbs';
import Dropdown from '../ui/dropdown';
import styles from './topbar.module.css';

export default function Topbar() {
  const navigate = useNavigate();
  const { toggleCommandPalette, state } = useApp();
  const { user, logout } = useAuth();

  const displayName = user?.name || state.settings.displayName || 'Developer';

  const userMenuItems = [
    {
      id: 'profile',
      label: displayName,
      icon: <User size={15} />,
    },
    {
      id: 'sep',
      label: '',
      separator: true,
    },
    {
      id: 'logout',
      label: 'Sign out',
      icon: <LogOut size={15} />,
      onClick: logout,
    },
  ];

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <Breadcrumbs />
      </div>

      <div className={styles.center}>
        <button
          className={styles.searchTrigger}
          onClick={toggleCommandPalette}
          title="Search documents, commands & actions"
        >
          <Search size={14} />
          <span>Quick search or command…</span>
          <span className={styles.searchShortcut}>⌘K</span>
        </button>
      </div>

      <div className={styles.right}>
        <div className={styles.statusPill} title="OCR API is online">
          <span className={styles.statusDot} />
          <span>API Online</span>
        </div>

        <button
          className={styles.uploadActionBtn}
          onClick={() => navigate('/analyze')}
          title="Upload and analyze a new document"
        >
          <Plus size={14} strokeWidth={2.2} />
          <span>Upload</span>
        </button>

        <button
          className={styles.iconBtn}
          title="Notifications"
        >
          <Bell size={16} strokeWidth={1.8} />
        </button>

        <Dropdown
          trigger={
            <div className={styles.avatar} title={`Logged in as ${displayName}`}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
}