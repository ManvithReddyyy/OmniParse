import styles from './skeleton.module.css';

interface SkeletonProps {
  variant?: 'line' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export default function Skeleton({
  variant = 'line',
  width,
  height,
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={{
        width: width ?? (variant === 'circle' ? '40px' : undefined),
        height: height ?? (variant === 'rect' ? '100px' : variant === 'circle' ? '40px' : undefined),
      }}
    />
  );
}
