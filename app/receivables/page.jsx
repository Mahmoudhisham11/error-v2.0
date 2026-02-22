'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import MainLayout, { useSidebar } from '@/components/Layout/MainLayout/MainLayout';
import StatCard from '@/components/ui/StatCard/StatCard';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import ConfirmModal from '@/components/ui/ConfirmModal/ConfirmModal';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import SafeButton from '@/components/ui/SafeButton/SafeButton';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import { useToast } from '@/components/ui/Toast/ToastProvider';
import { TbReceipt, TbMoneybag, TbTrendingUp, TbUsers, TbSearch, TbCalendar, TbCurrencyDollar, TbTrash } from 'react-icons/tb';
import { HiMenu, HiX } from 'react-icons/hi';
import { collection, onSnapshot, query, where, updateDoc, doc, runTransaction, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './styles.module.css';

function ReceivablesPageContent() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { showToast } = useToast();
  const headerRef = useRef(null);
  const [receivables, setReceivables] = useState([]);
  const [shop, setShop] = useState('');
  const [cash, setCash] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageShop = localStorage.getItem('shop');
      const storageUser = localStorage.getItem('userName');
      
      if (!storageShop) {
        window.location.href = '/';
        return;
      }
      
      setShop(storageShop);

      // Get user permissions
      const usersQ = query(collection(db, 'users'));
      const unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
        snapshot.forEach((doc) => {
          const user = doc.data();
          if (user.userName?.toLowerCase() === storageUser?.toLowerCase()) {
            setPermissions(user.permissions || {});
            if (!user.permissions?.receivables) {
              showToast('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
              window.location.href = '/';
              return;
            }
          }
        });
      });

      // Subscribe to receivables
      const receivablesQ = query(
        collection(db, 'receivables'),
        where('shop', '==', storageShop)
      );
      const unsubscribeReceivables = onSnapshot(receivablesQ, (snapshot) => {
        const receivablesArray = [];
        snapshot.forEach((doc) => {
          receivablesArray.push({ ...doc.data(), id: doc.id });
        });
        receivablesArray.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
        setReceivables(receivablesArray);
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
        unsubscribeReceivables();
        unsubscribeCash();
        unsubscribeUsers();
      };
    }
  }, [showToast]);

  // Calculate stats
  const stats = useMemo(() => {
    const pendingReceivables = receivables.filter(r => r.status === 'pending');
    const totalReceivables = pendingReceivables.reduce((acc, r) => acc + Number(r.remainingAmount || 0), 0);
    const totalCollected = receivables.reduce((acc, r) => acc + Number(r.paidAmount || 0), 0);
    const remaining = totalReceivables;
    const uniqueDebtors = new Set(pendingReceivables.map(r => r.debtorPhone)).size;

    return {
      totalReceivables,
      totalCollected,
      remaining,
      uniqueDebtors
    };
  }, [receivables]);

  // Filter receivables
  const filteredReceivables = useMemo(() => {
    if (!searchTerm) return receivables;
    return receivables.filter(r => 
      r.debtorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.debtorPhone?.includes(searchTerm)
    );
  }, [receivables, searchTerm]);

  const handleCollectClick = (receivable) => {
    setSelectedReceivable(receivable);
    setPaymentAmount('');
    setShowCollectModal(true);
  };

  const handleCollectPayment = async () => {
    if (isCollecting || !selectedReceivable) return;

    const paymentAmountNum = Number(paymentAmount);
    
    if (!paymentAmount || paymentAmount === '' || isNaN(paymentAmountNum) || paymentAmountNum <= 0) {
      showToast('برجاء إدخال مبلغ صحيح', 'error');
      return;
    }

    if (paymentAmountNum > selectedReceivable.remainingAmount) {
      showToast('المبلغ أكبر من المتبقي', 'error');
      return;
    }

    setIsCollecting(true);

    try {
      const receivableRef = doc(db, 'receivables', selectedReceivable.id);
      
      // قراءة receivable مباشرة (مثل عمليات الخطوط)
      const receivableSnap = await getDoc(receivableRef);
      
      if (!receivableSnap.exists()) {
        showToast('سجل الديون غير موجود', 'error');
        setIsCollecting(false);
        return;
      }

      const receivableData = receivableSnap.data();

      // التحقق من المبلغ مرة أخرى (باستخدام البيانات الحالية)
      if (paymentAmountNum > receivableData.remainingAmount) {
        showToast('المبلغ أكبر من المتبقي', 'error');
        setIsCollecting(false);
        return;
      }

      if (paymentAmountNum <= 0) {
        showToast('المبلغ يجب أن يكون أكبر من صفر', 'error');
        setIsCollecting(false);
        return;
      }

      // حساب المبالغ الجديدة
      const newPaidAmount = receivableData.paidAmount + paymentAmountNum;
      const newRemainingAmount = receivableData.remainingAmount - paymentAmountNum;
      const isFullyPaid = newRemainingAmount === 0;

      // التحصيل الكامل: حذف الدين نهائياً
      // التحصيل الجزئي: تحديث المستند
      if (isFullyPaid) {
        // التحصيل الكامل: حذف الدين نهائياً
        await deleteDoc(receivableRef);
      } else {
        // التحصيل الجزئي: تحديث المستند
        await updateDoc(receivableRef, {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: 'pending',
          updatedAt: serverTimestamp()
        });
      }

      // تحديث النقدي مباشرة (مثل عمليات الخطوط)
      if (!cash || !cash.id) {
        showToast('رصيد النقدي غير موجود', 'error');
        setIsCollecting(false);
        return;
      }

      const cashRef = doc(db, 'cash', cash.id);
      const currentCashAmount = Number(cash.amount || 0);
      const newCashAmount = currentCashAmount + paymentAmountNum;

      await updateDoc(cashRef, {
        amount: newCashAmount,
        updatedAt: new Date()
      });

      // تحديث العملية فقط إذا كانت موجودة (قراءة اختيارية)
      if (selectedReceivable.operationId) {
        try {
          const operationRef = doc(db, 'operations', selectedReceivable.operationId);
          const operationSnap = await getDoc(operationRef);
          
          if (operationSnap.exists()) {
            if (isFullyPaid) {
              // التحصيل الكامل: تحديث العملية
              await updateDoc(operationRef, {
                creditStatus: 'paid',
                creditPaid: newPaidAmount,
                creditRemaining: 0
              });
            } else {
              // التحصيل الجزئي: تحديث العملية
              await updateDoc(operationRef, {
                creditPaid: newPaidAmount,
                creditRemaining: newRemainingAmount
              });
            }
          }
        } catch (error) {
          console.error('خطأ أثناء تحديث العملية:', error);
          // نكمل حتى لو فشل تحديث العملية
        }
      }

      setShowCollectModal(false);
      setSelectedReceivable(null);
      setPaymentAmount('');
      showToast('تم التحصيل بنجاح', 'success');
    } catch (error) {
      console.error('خطأ أثناء التحصيل:', error);
      showToast(error.message || 'حدث خطأ أثناء التحصيل', 'error');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleDeleteReceivable = async () => {
    if (isDeleting || !deleteConfirm) return;

    setIsDeleting(true);

    try {
      const receivableRef = doc(db, 'receivables', deleteConfirm.id);
      
      // Check if receivable exists and get its data
      const receivableSnap = await getDoc(receivableRef);
      if (!receivableSnap.exists()) {
        showToast('الدين غير موجود', 'error');
        setDeleteConfirm(null);
        setIsDeleting(false);
        return;
      }

      const receivableData = receivableSnap.data();

      // If receivable is pending and has remaining amount, we should warn
      // But for now, we'll just delete it
      // Note: The associated operation should be handled separately if needed

      await deleteDoc(receivableRef);

      // Optionally update the associated operation if it exists
      if (receivableData.operationId) {
        try {
          const operationRef = doc(db, 'operations', receivableData.operationId);
          const operationSnap = await getDoc(operationRef);
          if (operationSnap.exists()) {
            // Update operation to remove credit fields
            await updateDoc(operationRef, {
              isCredit: false,
              creditStatus: null,
              creditAmount: null,
              creditPaid: null,
              creditRemaining: null,
              debtorName: null,
              debtorPhone: null,
              dueDate: null
            });
          }
        } catch (error) {
          console.error('Error updating operation:', error);
          // Continue even if operation update fails
        }
      }

      setDeleteConfirm(null);
      showToast('تم حذف الدين بنجاح', 'success');
    } catch (error) {
      console.error('خطأ أثناء حذف الدين:', error);
      showToast(error.message || 'حدث خطأ أثناء حذف الدين', 'error');
    } finally {
      setIsDeleting(false);
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
            <h1 className={styles.pageTitle}>الديون</h1>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <StatCard
            title="إجمالي الديون"
            value={`${stats.totalReceivables.toLocaleString('en-US')} جنيه`}
            icon={<TbMoneybag />}
            color="warning"
          />
          <StatCard
            title="المحصل"
            value={`${stats.totalCollected.toLocaleString('en-US')} جنيه`}
            icon={<TbTrendingUp />}
            color="success"
          />
          <StatCard
            title="المتبقي من الديون"
            value={`${stats.remaining.toLocaleString('en-US')} جنيه`}
            icon={<TbReceipt />}
            color="info"
          />
          <StatCard
            title="عدد العملاء"
            value={stats.uniqueDebtors}
            icon={<TbUsers />}
            color="primary"
          />
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchContainer}>
            <TbSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="ابحث عن المدين (اسم أو رقم)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.tableContainer}>
          {filteredReceivables.length === 0 ? (
            <EmptyState
              icon={<TbReceipt />}
              title="لا توجد ديون"
              message="لم يتم إضافة أي ديون بعد"
            />
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>التسلسل</th>
                    <th>اسم المدين</th>
                    <th>الرقم</th>
                    <th>الإجمالي</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                    <th>تاريخ الاستحقاق</th>
                    <th>المصدر</th>
                    <th>التفاعل</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceivables.map((receivable, index) => {
                    const dueDate = receivable.dueDate || null;
                    return (
                      <tr key={receivable.id} className={styles.tableRow}>
                        <td>{index + 1}</td>
                        <td>{receivable.debtorName}</td>
                        <td className={styles.phoneCell}>{receivable.debtorPhone}</td>
                        <td className={styles.moneyCell}>
                          {Number(receivable.totalAmount || 0).toLocaleString('en-US')} جنيه
                        </td>
                        <td className={styles.moneyCell}>
                          {Number(receivable.paidAmount || 0).toLocaleString('en-US')} جنيه
                        </td>
                        <td className={styles.moneyCell}>
                          {Number(receivable.remainingAmount || 0).toLocaleString('en-US')} جنيه
                        </td>
                        <td>
                          <StatusBadge status={receivable.status === 'paid' ? 'safe' : 'warning'}>
                            {receivable.status === 'paid' ? 'مدفوع' : 'قائم'}
                          </StatusBadge>
                        </td>
                        <td>
                          {dueDate ? (
                            <span className={styles.dateCell}>
                              <TbCalendar className={styles.dateIcon} />
                              {dueDate}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <span className={styles.sourceBadge}>
                            {receivable.source === 'machine' ? 'ماكينة' : 'خط'}
                          </span>
                        </td>
                        <td className={styles.actionsCell}>
                          <div className={styles.actionsButtons}>
                            {receivable.status === 'pending' && (
                              <button
                                onClick={() => handleCollectClick(receivable)}
                                className={styles.collectButton}
                                title="تحصيل"
                              >
                                <TbCurrencyDollar />
                                تحصيل
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteConfirm(receivable)}
                              className={styles.deleteButton}
                              title="حذف الدين"
                              disabled={isDeleting}
                            >
                              {isDeleting && deleteConfirm?.id === receivable.id ? (
                                <span className={styles.spinner}></span>
                              ) : (
                                <TbTrash />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCollectModal && selectedReceivable && (
        <div className={styles.modalOverlay} onClick={() => {
          setShowCollectModal(false);
          setSelectedReceivable(null);
          setPaymentAmount('');
        }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>تحصيل الديون</h2>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setShowCollectModal(false);
                  setSelectedReceivable(null);
                  setPaymentAmount('');
                }}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalMessage}>
                تحصيل من <strong>{selectedReceivable.debtorName}</strong> ({selectedReceivable.debtorPhone})
              </p>
              <div className={styles.modalDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>المتبقي:</span>
                  <span className={styles.detailValue}>
                    {Number(selectedReceivable.remainingAmount || 0).toLocaleString('en-US')} جنيه
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>المبلغ المدفوع:</span>
                  <span className={styles.detailValue}>
                    {Number(selectedReceivable.paidAmount || 0).toLocaleString('en-US')} جنيه
                  </span>
                </div>
              </div>
              <div className={styles.paymentInputContainer}>
                <label className={styles.inputLabel}>
                  <TbCurrencyDollar className={styles.inputIcon} />
                  مبلغ التحصيل:
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={paymentAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setPaymentAmount(val === '' ? '' : val);
                  }}
                  placeholder={`الحد الأقصى: ${Number(selectedReceivable.remainingAmount || 0).toLocaleString('en-US')}`}
                  disabled={isCollecting}
                  dir="ltr"
                  className={styles.moneyInput}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancel}
                onClick={() => {
                  setShowCollectModal(false);
                  setSelectedReceivable(null);
                  setPaymentAmount('');
                }}
                disabled={isCollecting}
              >
                إلغاء
              </button>
              <SafeButton
                onClick={handleCollectPayment}
                disabled={isCollecting || !paymentAmount || Number(paymentAmount) <= 0 || Number(paymentAmount) > selectedReceivable.remainingAmount}
                loading={isCollecting}
              >
                تحصيل
              </SafeButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteReceivable}
        title="حذف الدين"
        message={`هل أنت متأكد من حذف دين ${deleteConfirm?.debtorName} (${deleteConfirm?.debtorPhone})؟`}
        type="danger"
        loading={isDeleting}
        disabled={isDeleting}
      />
    </>
  );
}

export default function ReceivablesPage() {
  return (
    <MainLayout>
      <ReceivablesPageContent />
    </MainLayout>
  );
}

