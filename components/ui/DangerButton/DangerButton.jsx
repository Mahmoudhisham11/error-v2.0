'use client';
import styles from './DangerButton.module.css';

export default function DangerButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  className = ''
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${styles.button} ${className}`}
    >
      {loading ? (
        <>
          <span className={styles.spinner}></span>
          <span>جارٍ التنفيذ...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

