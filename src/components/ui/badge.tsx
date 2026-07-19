import styles from './badge.module.css';

interface BadgeProps {
  status: 'completed' | 'processing' | 'pending' | 'error' | 'info';
  label?: string;
  className?: string;
}

export default function Badge({ status, label, className = '' }: BadgeProps) {
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`${styles.badge} ${styles[status]} ${className}`}>
      <span className={styles.dot} />
      {displayLabel}
    </span>
  );
}
