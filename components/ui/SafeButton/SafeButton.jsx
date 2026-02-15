'use client';
import styles from './SafeButton.module.css';

export default function SafeButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  variant = 'primary',
  className = ''
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${styles.button} ${styles[variant]} ${className}`}
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

