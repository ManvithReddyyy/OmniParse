import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  ArrowRightLeft,
  Settings,
  Hexagon,
  Key,
  ChevronDown,
  PanelLeft,
  LifeBuoy,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../../context/app-context';
import styles from './sidebar.module.css';

const mainNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/analyze', label: 'Document Analyzer', icon: Search },
  { path: '/transform', label: 'Transform & Export', icon: ArrowRightLeft },
  { path: '/api-keys', label: 'API Keys & Docs', icon: Key },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { state, toggleSidebar } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [favOpen, setFavOpen] = useState(true);
  const [recordsOpen, setRecordsOpen] = useState(true);

  const isRouteActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`${styles.sidebar} ${state.sidebarCollapsed ? styles.collapsed : ''}`}>
        {/* Workspace Brand Selector & Toggle */}
        <div className={styles.brandRow}>
          <div className={styles.brandIcon}>
            <Hexagon size={13} strokeWidth={2.4} />
          </div>
          {!state.sidebarCollapsed && (
            <button type="button" className={styles.brandTrigger}>
              <span className={styles.brandName}>OmniParse</span>
              <ChevronDown size={13} className={styles.brandChevron} />
            </button>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleSidebar}
            title={state.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={!state.sidebarCollapsed ? { marginLeft: 'auto' } : undefined}
          >
            <PanelLeft size={14} strokeWidth={1.8} />
          </button>
        </div>

        {/* Quick Search Input Pill */}
        {!state.sidebarCollapsed ? (
          <div className={styles.searchBox} onClick={() => navigate('/analyze')}>
            <Search size={13} className={styles.searchIcon} />
            <span className={styles.searchPlaceholder}>Search anything</span>
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </div>
        ) : (
          <button
            type="button"
            className={styles.collapsedSearchBtn}
            onClick={() => navigate('/analyze')}
            title="Search anything (⌘K)"
          >
            <Search size={15} />
          </button>
        )}

        {/* Scrollable Navigation Area */}
        <div className={styles.scrollArea}>
          {/* Main Navigation */}
          <nav className={styles.navGroup}>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  title={state.sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={15} strokeWidth={1.8} className={styles.navItemIcon} />
                  {!state.sidebarCollapsed && (
                    <span className={styles.navItemLabel}>{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Favorites Section */}
          {!state.sidebarCollapsed && (
            <div className={styles.sectionBlock}>
              <button
                type="button"
                className={styles.sectionHeader}
                onClick={() => setFavOpen(!favOpen)}
              >
                <span>Favorites</span>
                <ChevronDown
                  size={11}
                  className={`${styles.sectionChevron} ${!favOpen ? styles.chevronClosed : ''}`}
                />
              </button>

              {favOpen && (
                <div className={styles.sectionList}>
                  <div className={styles.emptySectionText}>No favorites yet</div>
                </div>
              )}
            </div>
          )}

          {/* Records Section */}
          {!state.sidebarCollapsed && (
            <div className={styles.sectionBlock}>
              <button
                type="button"
                className={styles.sectionHeader}
                onClick={() => setRecordsOpen(!recordsOpen)}
              >
                <span>Records</span>
                <ChevronDown
                  size={11}
                  className={`${styles.sectionChevron} ${!recordsOpen ? styles.chevronClosed : ''}`}
                />
              </button>

              {recordsOpen && (
                <div className={styles.sectionList}>
                  <div className={styles.emptySectionText}>No records yet</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Footer Links & User Profile */}
        <div className={styles.footer}>
          {!state.sidebarCollapsed && (
            <div className={styles.footerLinks}>
              <NavLink to="/api-keys" className={styles.footerLink}>
                <LifeBuoy size={14} strokeWidth={1.8} className={styles.navItemIcon} />
                <span className={styles.navItemLabel}>API Documentation</span>
                <ArrowUpRight size={13} className={styles.externalIcon} />
              </NavLink>
            </div>
          )}

          {/* User Profile Bar */}
          <div className={styles.userProfile} onClick={() => navigate('/settings')}>
            <div className={styles.avatar}>OP</div>
            {!state.sidebarCollapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>OmniParse Admin</span>
                <span className={styles.userEmail}>workspace@omniparse.ai</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className={styles.bottomNav}>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isRouteActive(item.path);

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