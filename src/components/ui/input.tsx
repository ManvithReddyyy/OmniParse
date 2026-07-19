import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import styles from './input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  mono?: boolean;
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, mono, icon, className = '', ...props }, ref) => {
    const wrapperClasses = [
      styles.wrapper,
      mono ? styles.mono : '',
      error ? styles.error : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div className={wrapperClasses}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={icon ? styles.inputWithIcon : ''}>
          {icon && <span className={styles.inputIcon}>{icon}</span>}
          <input ref={ref} className={styles.input} {...props} />
        </div>
        {error && <span className={styles.errorMessage}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
