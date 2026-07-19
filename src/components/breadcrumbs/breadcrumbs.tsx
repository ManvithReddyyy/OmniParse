import { Link, useLocation } from 'react-router-dom';
import styles from './breadcrumbs.module.css';

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'analyze': 'Analyze',
  'transform': 'Transform',
  'settings': 'Settings',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <nav className={styles.breadcrumbs}>
        <span className={styles.crumbCurrent}>Dashboard</span>
      </nav>
    );
  }

  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <Link to="/" className={styles.crumb}>
        OmniParse
      </Link>
      {segments.map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;
        const label = routeLabels[segment] ?? segment;

        return (
          <span key={path} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span className={styles.separator}>/</span>
            {isLast ? (
              <span className={styles.crumbCurrent}>{label}</span>
            ) : (
              <Link to={path} className={styles.crumb}>
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
