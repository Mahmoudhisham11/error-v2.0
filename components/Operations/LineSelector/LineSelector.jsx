'use client';
import { useState, useEffect } from 'react';
import styles from './LineSelector.module.css';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import { TbPhone, TbWallet, TbTrendingUp, TbTrendingDown } from 'react-icons/tb';

export default function LineSelector({ 
  cards, 
  selectedPhone, 
  onPhoneChange, 
  selectedCard 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCards = cards.filter(card =>
    card.phone?.toString().includes(searchTerm)
  );

  const getLineStatus = (card) => {
    if (!card.originalDepositLimit && !card.originalWithdrawLimit) return 'safe';
    
    const depositUsed = card.originalDepositLimit > 0
      ? ((card.originalDepositLimit - card.depositLimit) / card.originalDepositLimit) * 100
      : 0;
    const withdrawUsed = card.originalWithdrawLimit > 0
      ? ((card.originalWithdrawLimit - card.withdrawLimit) / card.originalWithdrawLimit) * 100
      : 0;

    if (depositUsed >= 100 || withdrawUsed >= 100) return 'blocked';
    if (depositUsed >= 80 || withdrawUsed >= 80) return 'warning';
    return 'safe';
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <TbPhone className={styles.labelIcon} />
        اختر الخط
      </label>
      <input
        list="lines"
        type="text"
        value={selectedPhone}
        onChange={(e) => {
          onPhoneChange(e);
          setSearchTerm(e.target.value);
        }}
        placeholder="ابحث عن رقم الخط"
        className={styles.input}
      />
      <datalist id="lines">
        {filteredCards.map(card => (
          <option key={card.id} value={card.phone} />
        ))}
      </datalist>

      {selectedCard && (
        <div className={styles.cardInfo}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardName}>{selectedCard.userName}</h4>
            <StatusBadge status={getLineStatus(selectedCard)}>
              {getLineStatus(selectedCard) === 'blocked' ? 'محظور' : 
               getLineStatus(selectedCard) === 'warning' ? 'تحذير' : 'آمن'}
            </StatusBadge>
          </div>
          <div className={styles.cardDetails}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>
                <TbWallet className={styles.detailIcon} />
                الرصيد:
              </span>
              <span className={styles.detailValue}>
                {Number(selectedCard.amount || 0).toLocaleString('en-US')} جنيه
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>
                <TbTrendingUp className={styles.detailIcon} />
                يمكن إرسال:
              </span>
              <span className={styles.detailValue}>
                {Number(selectedCard.depositLimit || 0).toLocaleString('en-US')} جنيه
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>
                <TbTrendingDown className={styles.detailIcon} />
                يمكن استلام:
              </span>
              <span className={styles.detailValue}>
                {Number(selectedCard.withdrawLimit || 0).toLocaleString('en-US')} جنيه
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

