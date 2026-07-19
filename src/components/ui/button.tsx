import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import styles from './button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  iconOnly?: boolean;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, iconOnly, className = '', children, disabled, ...props }, ref) => {
    const classes = [
      styles.button,
      styles[variant],
      styles[size],
      loading ? styles.loading : '',
      iconOnly ? styles.iconOnly : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
        {loading && <span className={styles.spinner} />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
