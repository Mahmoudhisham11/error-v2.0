'use client';
import styles from './StatCard.module.css';

export default function StatCard({ title, value, icon, trend, color = 'primary' }) {
  const formatValue = (val) => {
    if (typeof val === 'number') {
      return val.toLocaleString('en-US');
    }
    return val;
  };

  return (
    <div className={`${styles.statCard} ${styles[color]}`}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.value}>{formatValue(value)}</p>
        {trend && (
          <span className={`${styles.trend} ${styles[trend.type]}`}>
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

