import { Search, Bell, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/app-context';
import Breadcrumbs from '../breadcrumbs/breadcrumbs';
import styles from './topbar.module.css';

export default function Topbar() {
  const navigate = useNavigate();
  const { toggleCommandPalette } = useApp();

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
      </div>
    </header>
  );
}