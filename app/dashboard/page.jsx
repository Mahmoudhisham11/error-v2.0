'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import MainLayout, { useSidebar } from '@/components/Layout/MainLayout/MainLayout';
import StatCard from '@/components/ui/StatCard/StatCard';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import ConfirmModal from '@/components/ui/ConfirmModal/ConfirmModal';
import SafeButton from '@/components/ui/SafeButton/SafeButton';
import { useToast } from '@/components/ui/Toast/ToastProvider';
import { TbMoneybag, TbReceipt, TbPhone, TbAlertTriangle, TbWallet, TbTrendingUp, TbEdit, TbTrash, TbPlus } from 'react-icons/tb';
import { HiMenu, HiX } from 'react-icons/hi';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './styles.module.css';

function DashboardPageContent() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { showToast } = useToast();
  const headerRef = useRef(null);
  const [operations, setOperations] = useState([]);
  const [cards, setCards] = useState([]);
  const [reports, setReports] = useState([]);
  const [cash, setCash] = useState(null);
  const [shop, setShop] = useState('');
  const [showCashModal, setShowCashModal] = useState(false);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [deleteReportsConfirm, setDeleteReportsConfirm] = useState(false);
  const [isDeletingReports, setIsDeletingReports] = useState(false);
  const [isSavingCash, setIsSavingCash] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageShop = localStorage.getItem('shop');
      if (!storageShop) {
        window.location.href = '/';
        return;
      }
      setShop(storageShop);

      // Subscribe to operations
      const operationsQ = query(
        collection(db, 'operations'),
        where('shop', '==', storageShop)
      );
      const unsubscribeOps = onSnapshot(operationsQ, (snapshot) => {
        const ops = [];
        snapshot.forEach((doc) => {
          ops.push({ ...doc.data(), id: doc.id });
        });
        setOperations(ops);
      });

      // Subscribe to cards
      const cardsQ = query(
        collection(db, 'cards'),
        where('shop', '==', storageShop)
      );
      const unsubscribeCards = onSnapshot(cardsQ, (snapshot) => {
        const cardsArray = [];
        const now = new Date();
        const currentMonth = now.getMonth();

        snapshot.forEach((docSnap) => {
          const card = { ...docSnap.data(), id: docSnap.id };
          
          // Handle monthly reset logic (same as cards page)
          const lastReset = card.lastReset ? new Date(card.lastReset).getMonth() : null;
          if (lastReset !== currentMonth && card.originalDepositLimit && card.originalWithdrawLimit) {
            card.depositLimit = card.originalDepositLimit;
            card.withdrawLimit = Math.max(0, Number(card.originalWithdrawLimit) - Number(card.amount || 0));
          }

          cardsArray.push(card);
        });
        setCards(cardsArray);
      });

      // Subscribe to reports
      const reportsQ = query(
        collection(db, 'reports'),
        where('shop', '==', storageShop)
      );
      const unsubscribeReports = onSnapshot(reportsQ, (snapshot) => {
        const reportsArray = [];
        snapshot.forEach((doc) => {
          reportsArray.push({ ...doc.data(), id: doc.id });
        });
        setReports(reportsArray);
      });

      // Subscribe to cash
      const cashQ = query(
        collection(db, 'cash'),
        where('shop', '==', storageShop)
      );
      const unsubscribeCash = onSnapshot(cashQ, (snapshot) => {
        if (!snapshot.empty) {
          const cashDoc = snapshot.docs[0];
          setCash({ ...cashDoc.data(), id: cashDoc.id });
        } else {
          setCash(null);
        }
      });

      return () => {
        unsubscribeOps();
        unsubscribeCards();
        unsubscribeReports();
        unsubscribeCash();
      };
    }
  }, []);

  // Calculate today's stats
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOps = operations.filter(op => {
      const opDate = new Date(op.date).toISOString().split('T')[0];
      return opDate === today;
    });

    const todayProfit = todayOps.reduce((acc, op) => acc + Number(op.commation || 0), 0);
    const todayCount = todayOps.length;

    return { profit: todayProfit, count: todayCount };
  }, [operations]);

  // Calculate lines near limits (80%+)
  const linesNearLimits = useMemo(() => {
    return cards.filter(card => {
      const depositUsed = card.originalDepositLimit > 0
        ? ((card.originalDepositLimit - card.depositLimit) / card.originalDepositLimit) * 100
        : 0;
      const withdrawUsed = card.originalWithdrawLimit > 0
        ? ((card.originalWithdrawLimit - card.withdrawLimit) / card.originalWithdrawLimit) * 100
        : 0;

      return depositUsed >= 80 || withdrawUsed >= 80;
    });
  }, [cards]);

  // Calculate new stats
  const stats = useMemo(() => {
    const totalCardsAmount = cards.reduce((acc, card) => acc + Number(card.amount || 0), 0);
    const cashAmount = cash?.amount || 0;
    const capital = totalCardsAmount + cashAmount;
    const totalWallets = totalCardsAmount;
    const totalProfit = reports.reduce((acc, r) => acc + Number(r.commation || 0), 0);

    return {
      capital,
      totalCash: cashAmount,
      totalWallets,
      totalProfit
    };
  }, [cards, cash, reports]);

  // Handle cash management
  const handleAddCash = () => {
    setCashAmount('');
    setIsEditingCash(false);
    setShowCashModal(true);
  };

  const handleEditCash = () => {
    if (cash) {
      setCashAmount(cash.amount?.toString() || '');
      setIsEditingCash(true);
      setShowCashModal(true);
    }
  };

  const handleSaveCash = async () => {
    if (!cashAmount || cashAmount === '' || isNaN(Number(cashAmount)) || Number(cashAmount) < 0) {
      showToast('برجاء إدخال مبلغ صحيح', 'error');
      return;
    }

    setIsSavingCash(true);
    try {
      const amount = Number(cashAmount);
      const now = new Date();

      if (isEditingCash && cash?.id) {
        // Update existing cash
        await updateDoc(doc(db, 'cash', cash.id), {
          amount,
          updatedAt: now
        });
        showToast('تم تحديث النقدي بنجاح', 'success');
      } else {
        // Add new cash
        await addDoc(collection(db, 'cash'), {
          shop,
          amount,
          createdAt: now,
          updatedAt: now
        });
        showToast('تم إضافة النقدي بنجاح', 'success');
      }

      setShowCashModal(false);
      setCashAmount('');
      setIsEditingCash(false);
    } catch (error) {
      console.error('خطأ أثناء حفظ النقدي:', error);
      showToast('حدث خطأ أثناء حفظ النقدي', 'error');
    } finally {
      setIsSavingCash(false);
    }
  };

  // Handle delete reports
  const handleDeleteReports = async () => {
    if (!shop) return;

    setIsDeletingReports(true);
    try {
      const q = query(collection(db, 'reports'), where('shop', '==', shop));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      showToast('تم حذف جميع التقارير بنجاح', 'success');
      setDeleteReportsConfirm(false);
    } catch (error) {
      console.error('خطأ أثناء حذف التقارير:', error);
      showToast('حدث خطأ أثناء حذف التقارير', 'error');
    } finally {
      setIsDeletingReports(false);
    }
  };

  return (
    <>
      <div className={styles.pageContainer}>
        <div className={styles.header} ref={headerRef} data-header>
          <div className={styles.titleSection}>
            <button
              className={styles.burgerButton}
              onClick={toggleSidebar}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <HiX /> : <HiMenu />}
            </button>
            <h1 className={styles.pageTitle}>لوحة التحكم</h1>
          </div>
          <div className={styles.headerActions}>
            {!cash ? (
              <button
                onClick={handleAddCash}
                className={styles.addCashButton}
                disabled={isDeletingReports || isSavingCash}
              >
                <TbPlus /> إضافة نقدي
              </button>
            ) : (
              <button
                onClick={handleEditCash}
                className={styles.editCashButton}
                disabled={isDeletingReports || isSavingCash}
              >
                <TbEdit /> تعديل النقدي
              </button>
            )}
            <button
              onClick={() => setDeleteReportsConfirm(true)}
              className={styles.deleteAllButton}
              disabled={isDeletingReports || isSavingCash || reports.length === 0}
            >
              <TbTrash /> حذف التقارير الخاصة بالفرع
            </button>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <StatCard
            title="رأس المال"
            value={`${stats.capital.toLocaleString('en-US')} جنيه`}
            icon={<TbMoneybag />}
            color="success"
          />
          <StatCard
            title="إجمالي النقدي"
            value={`${stats.totalCash.toLocaleString('en-US')} جنيه`}
            icon={<TbWallet />}
            color="primary"
          />
          <StatCard
            title="إجمالي رصيد المحافظ"
            value={`${stats.totalWallets.toLocaleString('en-US')} جنيه`}
            icon={<TbPhone />}
            color="info"
          />
          <StatCard
            title="الأرباح"
            value={`${stats.totalProfit.toLocaleString('en-US')} جنيه`}
            icon={<TbTrendingUp />}
            color="success"
          />
        </div>

      {linesNearLimits.length > 0 && (
        <div className={styles.warningSection}>
          <h2 className={styles.sectionTitle}>خطوط تحتاج إلى انتباه</h2>
          <div className={styles.linesList}>
            {linesNearLimits.map((line) => {
              const depositUsed = line.originalDepositLimit > 0
                ? ((line.originalDepositLimit - line.depositLimit) / line.originalDepositLimit) * 100
                : 0;
              const withdrawUsed = line.originalWithdrawLimit > 0
                ? ((line.originalWithdrawLimit - line.withdrawLimit) / line.originalWithdrawLimit) * 100
                : 0;

              const status = depositUsed >= 100 || withdrawUsed >= 100 ? 'blocked' : 'warning';

              return (
                <div key={line.id} className={styles.lineCard}>
                  <div className={styles.lineInfo}>
                    <h3 className={styles.lineName}>{line.userName || 'غير معروف'}</h3>
                    <p className={styles.linePhone}>{line.phone}</p>
                  </div>
                  <div className={styles.lineStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>حد الإرسال:</span>
                      <span className={styles.statValue}>
                        {depositUsed.toFixed(1)}%
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>حد الاستلام:</span>
                      <span className={styles.statValue}>
                        {withdrawUsed.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={status}>
                    {status === 'blocked' ? 'محظور' : 'تحذير'}
                  </StatusBadge>
                </div>
              );
            })}
          </div>
        </div>
      )}

        {cards.length === 0 && (
          <EmptyState
            icon={<TbPhone />}
            title="لا توجد خطوط"
            message="لم يتم إضافة أي خطوط بعد"
          />
        )}
      </div>

      {/* Cash Modal */}
      {showCashModal && (
        <div className={styles.modalOverlay} onClick={() => !isSavingCash && setShowCashModal(false)}>
          <div className={styles.cashModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {isEditingCash ? 'تعديل النقدي' : 'إضافة نقدي'}
              </h2>
              <button
                className={styles.closeButton}
                onClick={() => !isSavingCash && setShowCashModal(false)}
                disabled={isSavingCash}
              >
                <HiX />
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.inputContainer}>
                <label className={styles.label}>
                  <TbWallet className={styles.labelIcon} />
                  المبلغ
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={cashAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setCashAmount(value);
                  }}
                  placeholder="0"
                  dir="ltr"
                  style={{ textAlign: 'left', fontFamily: 'Courier New, monospace' }}
                  disabled={isSavingCash}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => !isSavingCash && setShowCashModal(false)}
                disabled={isSavingCash}
              >
                إلغاء
              </button>
              <SafeButton
                onClick={handleSaveCash}
                loading={isSavingCash}
                disabled={isSavingCash}
              >
                {isEditingCash ? 'تحديث' : 'إضافة'}
              </SafeButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Reports Confirmation */}
      <ConfirmModal
        isOpen={deleteReportsConfirm}
        onClose={() => setDeleteReportsConfirm(false)}
        onConfirm={handleDeleteReports}
        title="حذف التقارير الخاصة بالفرع"
        message="هل أنت متأكد من حذف جميع التقارير الخاصة بهذا الفرع؟ لا يمكن التراجع عن هذا الإجراء."
        type="danger"
        loading={isDeletingReports}
        disabled={isDeletingReports}
      />
    </>
  );
}

export default function Dashboard() {
  return (
    <MainLayout>
      <DashboardPageContent />
    </MainLayout>
  );
}

