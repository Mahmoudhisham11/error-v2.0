'use client';
import { useEffect } from 'react';
import { TbCheck, TbAlertCircle, TbAlertTriangle, TbInfoCircle, TbX } from 'react-icons/tb';
import styles from './Toast.module.css';

const Toast = ({ id, message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <TbCheck className={styles.icon} />;
      case 'error':
        return <TbAlertCircle className={styles.icon} />;
      case 'warning':
        return <TbAlertTriangle className={styles.icon} />;
      case 'info':
        return <TbInfoCircle className={styles.icon} />;
      default:
        return <TbInfoCircle className={styles.icon} />;
    }
  };

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          {getIcon()}
        </div>
        <p className={styles.message}>{message}</p>
        <button
          className={styles.closeButton}
          onClick={() => onClose(id)}
          aria-label="إغلاق"
        >
          <TbX />
        </button>
      </div>
    </div>
  );
};

export default Toast;

