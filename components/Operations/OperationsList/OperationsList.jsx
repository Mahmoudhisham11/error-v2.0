'use client';
import { memo, useState } from 'react';
import styles from './OperationsList.module.css';
import { TbTrash } from 'react-icons/tb';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { TbReceipt } from 'react-icons/tb';
import ConfirmModal from '@/components/ui/ConfirmModal/ConfirmModal';

function OperationsList({ operations, onDelete, isDeleting = false, deletingId = null }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  if (operations.length === 0) {
    return (
      <EmptyState
        icon={<TbReceipt />}
        title="لا توجد عمليات"
        message="لم يتم تنفيذ أي عمليات اليوم"
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>التسلسل</th>
              <th>الرقم المستخدم</th>
              <th>نوع العملية</th>
              <th>المبلغ</th>
              <th>العمولة</th>
              <th>صافي المبلغ</th>
              <th>رصيد الخط</th>
              <th>اسم العميل</th>
              <th>التفاعل</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((operation, index) => {
              const balance = operation.amountBefore !== undefined
                ? (operation.type === 'استلام'
                    ? Number(operation.amountBefore) + Number(operation.amount)
                    : Number(operation.amountBefore) - Number(operation.amount))
                : 0;

              const netAmount = operation.type === "ارسال"
                ? Number(operation.amount) + Number(operation.commation)
                : Number(operation.amount) - Number(operation.commation);

              return (
                <OperationRow
                  key={operation.id}
                  operation={operation}
                  index={index}
                  balance={balance}
                  netAmount={netAmount}
                  onDelete={() => setDeleteConfirm(operation)}
                  isDeleting={isDeleting && deletingId === operation.id}
                  disabled={isDeleting}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            onDelete(deleteConfirm.id);
            setDeleteConfirm(null);
          }
        }}
        title="حذف العملية"
        message={`هل أنت متأكد من حذف هذه العملية؟`}
        type="danger"
      />
    </div>
  );
}

const OperationRow = memo(function OperationRow({ operation, index, balance, netAmount, onDelete, isDeleting = false, disabled = false }) {
  const isSend = operation.type === 'ارسال';

  return (
    <tr className={`${styles.row} ${isSend ? styles.sendRow : styles.receiveRow}`}>
      <td>{index + 1}</td>
      <td className={styles.phoneCell}>{operation.phone}</td>
      <td>
        <span className={`${styles.typeBadge} ${isSend ? styles.sendBadge : styles.receiveBadge}`}>
          {operation.type}
        </span>
      </td>
      <td className={styles.moneyCell}>{Number(operation.amount).toLocaleString('en-US')}</td>
      <td className={styles.moneyCell}>{Number(operation.commation || 0).toLocaleString('en-US')}</td>
      <td className={styles.moneyCell}>{netAmount.toLocaleString('en-US')}</td>
      <td className={styles.moneyCell}>{balance.toLocaleString('en-US')}</td>
      <td>{operation.name || '-'}</td>
      <td className={styles.actionsCell}>
        <button
          onClick={onDelete}
          className={styles.deleteButton}
          title="حذف العملية"
          disabled={disabled}
        >
          {isDeleting ? (
            <span className={styles.spinner}></span>
          ) : (
            <TbTrash />
          )}
        </button>
      </td>
    </tr>
  );
});

export default OperationsList;

