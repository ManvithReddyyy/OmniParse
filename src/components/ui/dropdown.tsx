import { useState, useRef, useEffect, type ReactNode } from 'react';
import styles from './dropdown.module.css';

interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  separator?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export default function Dropdown({ trigger, items, align = 'right', className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={`${styles.wrapper} ${className}`} ref={ref}>
      <div className={styles.trigger} onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      {open && (
        <div className={`${styles.menu} ${align === 'left' ? styles.menuLeft : ''}`}>
          {items.map((item) =>
            item.separator ? (
              <div key={item.id} className={styles.separator} />
            ) : (
              <button
                key={item.id}
                className={styles.item}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
