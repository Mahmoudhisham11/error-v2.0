'use client';
import styles from './StatusBadge.module.css';

export default function StatusBadge({ status = 'safe', children }) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {children || getStatusText(status)}
    </span>
  );
}

function getStatusText(status) {
  const statusMap = {
    safe: 'آمن',
    warning: 'تحذير',
    blocked: 'محظور'
  };
  return statusMap[status] || status;
}

