'use client';
import { useEffect } from 'react';
import styles from './OperationModal.module.css';
import OperationForm from '@/components/Operations/OperationForm/OperationForm';
import LineSelector from '@/components/Operations/LineSelector/LineSelector';
import { IoMdCloseCircleOutline } from 'react-icons/io';

export default function OperationModal({
  isOpen,
  onClose,
  cards,
  selectedPhone,
  onPhoneChange,
  selectedCard,
  type,
  onTypeChange,
  name,
  onNameChange,
  amount,
  onAmountChange,
  commation,
  onCommationChange,
  isProcessing,
  onSubmit,
  onCloseDay
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>إضافة عملية جديدة</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <IoMdCloseCircleOutline />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.formSection}>
            <LineSelector
              cards={cards}
              selectedPhone={selectedPhone}
              onPhoneChange={onPhoneChange}
              selectedCard={selectedCard}
            />
          </div>

          <div className={styles.formSection}>
            <OperationForm
              type={type}
              onTypeChange={onTypeChange}
              phone={selectedPhone}
              onPhoneChange={onPhoneChange}
              name={name}
              onNameChange={onNameChange}
              amount={amount}
              onAmountChange={onAmountChange}
              commation={commation}
              onCommationChange={onCommationChange}
              selectedCard={selectedCard}
              isProcessing={isProcessing}
              onSubmit={onSubmit}
              onCloseDay={onCloseDay}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

