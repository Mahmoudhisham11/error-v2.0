'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConfirmModal.module.css';
import { IoMdCloseCircleOutline } from 'react-icons/io';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'safe',
  details = null,
  showUndo = false,
  undoTimeout = 10000,
  loading = false,
  disabled = false
}) {
  const [undoTimer, setUndoTimer] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCanUndo(false);
      if (undoTimer) {
        clearTimeout(undoTimer);
        setUndoTimer(null);
      }
    }
  }, [isOpen, undoTimer]);

  const handleConfirm = () => {
    if (showUndo) {
      setCanUndo(true);
      const timer = setTimeout(() => {
        setCanUndo(false);
        onConfirm();
      }, undoTimeout);
      setUndoTimer(timer);
    } else {
      onConfirm();
    }
  };

  const handleUndo = () => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
    }
    setCanUndo(false);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles[type]}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <IoMdCloseCircleOutline />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>{message}</p>

          {details && (
            <div className={styles.details}>
              {details.map((detail, index) => (
                <div key={index} className={styles.detailRow}>
                  <span className={styles.detailLabel}>{detail.label}:</span>
                  <span className={styles.detailValue}>{detail.value}</span>
                </div>
              ))}
            </div>
          )}

          {canUndo && showUndo && (
            <div className={styles.undoBanner}>
              <span>يمكنك التراجع خلال {Math.ceil(undoTimeout / 1000)} ثانية</span>
              <button className={styles.undoButton} onClick={handleUndo}>
                تراجع
              </button>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
            disabled={loading || disabled}
          >
            إلغاء
          </button>
          <button 
            className={`${styles.confirmButton} ${styles[type]}`} 
            onClick={handleConfirm}
            disabled={loading || disabled}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                <span>جارٍ التنفيذ...</span>
              </>
            ) : (
              'تأكيد'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

