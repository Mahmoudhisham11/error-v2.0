'use client';
import { useState } from 'react';
import styles from './OperationForm.module.css';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import LimitsProgress from '@/components/ui/LimitsProgress/LimitsProgress';
import SafeButton from '@/components/ui/SafeButton/SafeButton';
import DangerButton from '@/components/ui/DangerButton/DangerButton';
import { TbArrowsExchange, TbUser, TbWallet, TbCoins, TbCalculator, TbCurrencyDollar } from 'react-icons/tb';
import { HiOutlineArrowCircleUp, HiOutlineArrowCircleDown } from 'react-icons/hi';

export default function OperationForm({
  type,
  onTypeChange,
  phone,
  onPhoneChange,
  name,
  onNameChange,
  amount,
  onAmountChange,
  commation,
  onCommationChange,
  selectedCard,
  isProcessing,
  onSubmit,
  onCloseDay
}) {
  const netAmount = (amount === '' || amount === null || amount === undefined) || (commation === '' || commation === null || commation === undefined)
    ? 0
    : type === "ارسال"
    ? Number(amount) + Number(commation)
    : Number(amount) - Number(commation);

  const isSendOperation = type === 'ارسال';
  const hasSelectedCard = selectedCard && phone;

  return (
    <div className={`${styles.form} ${isSendOperation ? styles.danger : styles.safe}`}>
      <div className={styles.formHeader}>
        <h2 className={styles.title}>
          <TbArrowsExchange className={styles.titleIcon} />
          نموذج العملية
        </h2>
      </div>

      <div className={styles.formContent}>
        <div className="inputContainer">
          <label>
            {isSendOperation ? <HiOutlineArrowCircleUp className={styles.labelIcon} /> : <HiOutlineArrowCircleDown className={styles.labelIcon} />}
            نوع العملية:
          </label>
          <select 
            value={type} 
            onChange={(e) => onTypeChange(e.target.value)}
            disabled={isProcessing}
            className={isSendOperation ? styles.dangerSelect : ''}
          >
            <option value="ارسال">ارسال</option>
            <option value="استلام">استلام</option>
          </select>
        </div>

        <div className="inputContainer">
          <label>
            <TbUser className={styles.labelIcon} />
            اسم العميل:
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="اسم العميل"
            disabled={isProcessing}
          />
        </div>

        <div className={styles.amountRow}>
          <div className="inputContainer">
            <label>
              <TbCurrencyDollar className={styles.labelIcon} />
              المبلغ:
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={amount === '' || amount === null || amount === undefined ? '' : amount.toString()}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                onAmountChange(val === '' ? '' : val);
              }}
              placeholder="ادخل المبلغ"
              disabled={isProcessing}
              dir="ltr"
              style={{ textAlign: 'left', fontFamily: 'Courier New, monospace' }}
            />
          </div>
          <div className="inputContainer">
            <label>
              <TbCoins className={styles.labelIcon} />
              العمولة:
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={commation === '' || commation === null || commation === undefined ? '' : commation.toString()}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                onCommationChange(val === '' ? '' : val);
              }}
              placeholder="ادخل العمولة"
              disabled={isProcessing}
              dir="ltr"
              style={{ textAlign: 'left', fontFamily: 'Courier New, monospace' }}
            />
          </div>
        </div>

        <div className={styles.netAmount}>
          <label>
            <TbCalculator className={styles.labelIcon} />
            صافي المبلغ:
          </label>
          <div className={styles.netValue}>
            {netAmount.toLocaleString('en-US')} جنيه
          </div>
        </div>

        {hasSelectedCard && (
          <div className={styles.limitsSection}>
            <LimitsProgress
              depositLimit={Number(selectedCard.depositLimit || 0)}
              originalDepositLimit={Number(selectedCard.originalDepositLimit || 0)}
              withdrawLimit={Number(selectedCard.withdrawLimit || 0)}
              originalWithdrawLimit={Number(selectedCard.originalWithdrawLimit || 0)}
            />
          </div>
        )}

        <div className={styles.formActions}>
          {isSendOperation ? (
            <DangerButton
              onClick={onSubmit}
              disabled={isProcessing || !phone || amount === '' || amount === null || amount === undefined || commation === '' || commation === null || commation === undefined}
              loading={isProcessing}
            >
              إرسال رصيد
            </DangerButton>
          ) : (
            <SafeButton
              onClick={onSubmit}
              disabled={isProcessing || !phone || amount === '' || amount === null || amount === undefined || commation === '' || commation === null || commation === undefined}
              loading={isProcessing}
            >
              استلام رصيد
            </SafeButton>
          )}
        </div>
      </div>
    </div>
  );
}

