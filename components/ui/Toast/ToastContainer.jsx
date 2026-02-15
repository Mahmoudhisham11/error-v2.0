'use client';
import Toast from './Toast';
import styles from './ToastContainer.module.css';

const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={onRemove}
        />
      ))}
    </div>
  );
};

export default ToastContainer;

