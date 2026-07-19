import { type InputHTMLAttributes, forwardRef } from 'react';
import styles from './checkbox.module.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, checked, onChange, id, className = '', ...props }, ref) => {
    return (
      <label className={`${styles.wrapper} ${className}`} htmlFor={id}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className={styles.checkbox}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          {...props}
        />
        {label && <span className={styles.label}>{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
