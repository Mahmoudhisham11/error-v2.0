'use client';
import styles from './LimitsProgress.module.css';

export default function LimitsProgress({
  depositLimit,
  originalDepositLimit,
  withdrawLimit,
  originalWithdrawLimit
}) {
  const depositUsed = originalDepositLimit > 0 
    ? ((originalDepositLimit - depositLimit) / originalDepositLimit) * 100 
    : 0;
  
  const withdrawUsed = originalWithdrawLimit > 0
    ? ((originalWithdrawLimit - withdrawLimit) / originalWithdrawLimit) * 100
    : 0;

  const getStatus = (percentage) => {
    if (percentage >= 100) return 'blocked';
    if (percentage >= 80) return 'warning';
    return 'safe';
  };

  const depositStatus = getStatus(depositUsed);
  const withdrawStatus = getStatus(withdrawUsed);

  return (
    <div className={styles.container}>
      <div className={styles.limitItem}>
        <div className={styles.limitHeader}>
          <span className={styles.limitLabel}>حد الإرسال</span>
          <span className={styles.limitValue}>
            {depositLimit.toLocaleString('en-US')} / {originalDepositLimit.toLocaleString('en-US')}
          </span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${styles[depositStatus]}`}
            style={{ width: `${Math.min(depositUsed, 100)}%` }}
          />
        </div>
        <div className={styles.limitFooter}>
          <span className={styles.percentage}>{depositUsed.toFixed(1)}%</span>
          <span className={`${styles.status} ${styles[depositStatus]}`}>
            {depositStatus === 'blocked' ? 'محظور' : depositStatus === 'warning' ? 'تحذير' : 'آمن'}
          </span>
        </div>
      </div>

      <div className={styles.limitItem}>
        <div className={styles.limitHeader}>
          <span className={styles.limitLabel}>حد الاستلام</span>
          <span className={styles.limitValue}>
            {withdrawLimit.toLocaleString('en-US')} / {originalWithdrawLimit.toLocaleString('en-US')}
          </span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${styles[withdrawStatus]}`}
            style={{ width: `${Math.min(withdrawUsed, 100)}%` }}
          />
        </div>
        <div className={styles.limitFooter}>
          <span className={styles.percentage}>{withdrawUsed.toFixed(1)}%</span>
          <span className={`${styles.status} ${styles[withdrawStatus]}`}>
            {withdrawStatus === 'blocked' ? 'محظور' : withdrawStatus === 'warning' ? 'تحذير' : 'آمن'}
          </span>
        </div>
      </div>
    </div>
  );
}

