import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  ArrowRightLeft,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Hexagon,
} from 'lucide-react';
import { useApp } from '../../context/app-context';
import styles from './sidebar.module.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/analyze', label: 'Analyze', icon: Search },
  { path: '/transform', label: 'Transform', icon: ArrowRightLeft },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { state, toggleSidebar } = useApp();
  const location = useLocation();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`${styles.sidebar} ${state.sidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Hexagon size={16} strokeWidth={2.5} />
          </div>
          <span className={styles.brandName}>OmniParse</span>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>Navigation</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                title={state.sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} strokeWidth={1.8} className={styles.navItemIcon} />
                <span className={styles.navItemLabel}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.bottom}>
          <button className={styles.collapseBtn} onClick={toggleSidebar} title="Toggle sidebar">
            {state.sidebarCollapsed ? (
              <ChevronsRight size={18} strokeWidth={1.8} />
            ) : (
              <>
                <ChevronsLeft size={18} strokeWidth={1.8} />
                <span className={styles.navItemLabel}>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className={styles.bottomNav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`${styles.bottomNavItem} ${isActive ? styles.bottomNavItemActive : ''}`}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
