'use client';
import styles from './LineProfileModal.module.css';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import StatusBadge from '../StatusBadge/StatusBadge';
import LimitsProgress from '../LimitsProgress/LimitsProgress';
import SafeButton from '../SafeButton/SafeButton';

export default function LineProfileModal({ isOpen, onClose, line, onEdit, canEdit = false }) {
  if (!isOpen || !line) return null;

  const getLineStatus = () => {
    const depositUsed = line.originalDepositLimit > 0
      ? ((line.originalDepositLimit - line.depositLimit) / line.originalDepositLimit) * 100
      : 0;
    const withdrawUsed = line.originalWithdrawLimit > 0
      ? ((line.originalWithdrawLimit - line.withdrawLimit) / line.originalWithdrawLimit) * 100
      : 0;

    if (depositUsed >= 100 || withdrawUsed >= 100) return 'blocked';
    if (depositUsed >= 80 || withdrawUsed >= 80) return 'warning';
    return 'safe';
  };

  const status = getLineStatus();
  const lastResetDate = line.lastReset 
    ? new Date(line.lastReset).toLocaleDateString('ar-EG')
    : 'غير متاح';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>معلومات الخط</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <IoMdCloseCircleOutline />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.statusSection}>
            <StatusBadge status={status}>
              {status === 'blocked' ? 'محظور' : status === 'warning' ? 'تحذير' : 'آمن'}
            </StatusBadge>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>اسم المالك:</span>
              <span className={styles.value}>{line.userName || 'غير متاح'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>رقم الخط:</span>
              <span className={styles.value}>{line.phone || 'غير متاح'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>الرقم القومي:</span>
              <span className={styles.value}>{line.number || 'غير متاح'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>الرصيد الحالي:</span>
              <span className={`${styles.value} ${styles.money}`}>
                {Number(line.amount || 0).toLocaleString('en-US')} جنيه
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>آخر إعادة ضبط:</span>
              <span className={styles.value}>{lastResetDate}</span>
            </div>
          </div>

          <div className={styles.limitsSection}>
            <h3 className={styles.sectionTitle}>الحدود الشهرية</h3>
            <LimitsProgress
              depositLimit={Number(line.depositLimit || 0)}
              originalDepositLimit={Number(line.originalDepositLimit || 0)}
              withdrawLimit={Number(line.withdrawLimit || 0)}
              originalWithdrawLimit={Number(line.originalWithdrawLimit || 0)}
            />
          </div>
        </div>

        {canEdit && onEdit && (
          <div className={styles.footer}>
            <SafeButton onClick={onEdit}>تعديل</SafeButton>
          </div>
        )}
      </div>
    </div>
  );
}

