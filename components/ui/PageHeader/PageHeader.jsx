'use client';
import styles from './PageHeader.module.css';

export default function PageHeader({ title, subtitle, actions = [] }) {
  return (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action, index) => (
            <div key={index}>{action}</div>
          ))}
        </div>
      )}
    </div>
  );
}

