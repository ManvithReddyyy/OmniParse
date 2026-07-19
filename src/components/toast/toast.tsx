import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToast } from '../../context/toast-context';
import styles from './toast.module.css';

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
            <Icon size={16} className={styles.icon} />
            <span className={styles.message}>{toast.message}</span>
            <button className={styles.close} onClick={() => removeToast(toast.id)}>
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
