import styles from './toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  className?: string;
}

export default function Toggle({ checked, onChange, label, description, className = '' }: ToggleProps) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {(label || description) && (
        <div>
          {label && <div className={styles.label}>{label}</div>}
          {description && <div className={styles.description}>{description}</div>}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        className={`${styles.toggle} ${checked ? styles.active : ''}`}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}
