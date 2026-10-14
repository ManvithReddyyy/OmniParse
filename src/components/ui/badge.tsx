import styles from './badge.module.css';

interface BadgeProps {
  status: 'completed' | 'processing' | 'pending' | 'error' | 'info';
  label?: string;
  className?: string;
  dot?: boolean;
}

export default function Badge({ status, label, className = '', dot }: BadgeProps) {
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);
  const showDot = dot !== undefined ? dot : status !== 'completed';

  return (
    <span className={`${styles.badge} ${styles[status]} ${className}`}>
      {showDot && <span className={styles.dot} />}
      {displayLabel}
    </span>
  );
}
