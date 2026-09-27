import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  ArrowRightLeft,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Hexagon,
  Key,
} from 'lucide-react';
import { useApp } from '../../context/app-context';
import styles from './sidebar.module.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/analyze', label: 'Document Analyzer', icon: Search },
  { path: '/transform', label: 'Transform & Export', icon: ArrowRightLeft },
  { path: '/api-keys', label: 'API Keys & Docs', icon: Key },
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
          {!state.sidebarCollapsed && (
            <div className={styles.brandInfo}>
              <span className={styles.brandName}>OmniParse</span>
              <span className={styles.brandTag}>IDP v2.3</span>
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          {!state.sidebarCollapsed && <div className={styles.navSection}>WORKSPACE</div>}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
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
                {!state.sidebarCollapsed && (
                  <span className={styles.navItemLabel}>{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Engine Status Widget */}
        {!state.sidebarCollapsed && (
          <div className={styles.statusWidget}>
            <div className={styles.statusHeader}>
              <span className={styles.statusPulse} />
              <span>OmniParse Engine</span>
            </div>
            <div className={styles.statusSub}>Online</div>
          </div>
        )}

        <div className={styles.bottom}>
          <button
            className={styles.collapseBtn}
            onClick={toggleSidebar}
            title={state.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
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
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`${styles.bottomNavItem} ${isActive ? styles.bottomNavItemActive : ''}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
