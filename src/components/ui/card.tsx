import { type ReactNode, type HTMLAttributes } from 'react';
import styles from './card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  noPadding?: boolean;
  children: ReactNode;
}

interface CardHeaderProps {
  title?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function Card({ interactive, noPadding, className = '', children, ...props }: CardProps) {
  const classes = [
    styles.card,
    interactive ? styles.interactive : '',
    noPadding ? styles.noPadding : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, children }: CardHeaderProps) {
  return (
    <div className={styles.header}>
      {title && <span className={styles.headerTitle}>{title}</span>}
      {children}
      {action && <span className={styles.headerAction}>{action}</span>}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.body} ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.footer} ${className}`}>{children}</div>;
}
