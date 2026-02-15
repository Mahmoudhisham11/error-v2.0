'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import MainLayout, { useSidebar } from '@/components/Layout/MainLayout/MainLayout';
import ConfirmModal from '@/components/ui/ConfirmModal/ConfirmModal';
import SafeButton from '@/components/ui/SafeButton/SafeButton';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { useToast } from '@/components/ui/Toast/ToastProvider';
import { TbSearch, TbReceipt, TbEdit, TbTrash, TbPlus, TbCalendar, TbCurrencyDollar, TbFileText } from 'react-icons/tb';
import { HiMenu, HiX } from 'react-icons/hi';
import { collection, addDoc, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './styles.module.css';

function ExpensesPageContent() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { showToast } = useToast();
  const headerRef = useRef(null);
  const [expenses, setExpenses] = useState([]);
  const [shop, setShop] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteAllExpensesConfirm, setDeleteAllExpensesConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageShop = localStorage.getItem('shop');
      if (!storageShop) {
        window.location.href = '/';
        return;
      }
      setShop(storageShop);

      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setDate(today);

      // Subscribe to expenses
      const expensesQ = query(
        collection(db, 'expenses'),
        where('shop', '==', storageShop)
      );
      const unsubscribe = onSnapshot(expensesQ, (snapshot) => {
        const expensesArray = [];
        snapshot.forEach((doc) => {
          expensesArray.push({ ...doc.data(), id: doc.id });
        });
        // Sort by date descending (newest first)
        expensesArray.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
        setExpenses(expensesArray);
      });

      return () => unsubscribe();
    }
  }, []);

  const filteredExpenses = useMemo(() => {
    if (!searchTerm) return expenses;
    const term = searchTerm.toLowerCase();
    return expenses.filter(expense =>
      expense.reason?.toLowerCase().includes(term) ||
      expense.amount?.toString().includes(term) ||
      expense.date?.includes(term)
    );
  }, [expenses, searchTerm]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, expense) => acc + Number(expense.amount || 0), 0);
  }, [filteredExpenses]);

  const handleAddExpense = () => {
    setAmount('');
    setReason('');
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    setIsEditing(false);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEditExpense = (expense) => {
    setAmount(expense.amount?.toString() || '');
    setReason(expense.reason || '');
    setDate(expense.date || new Date().toISOString().split('T')[0]);
    setIsEditing(true);
    setEditingId(expense.id);
    setShowForm(true);
  };

  const handleSaveExpense = async () => {
    if (!amount || amount === '' || isNaN(Number(amount)) || Number(amount) <= 0) {
      showToast('برجاء إدخال مبلغ صحيح', 'error');
      return;
    }

    if (!reason || reason.trim() === '') {
      showToast('برجاء إدخال سبب المصروف', 'error');
      return;
    }

    if (!date) {
      showToast('برجاء إدخال تاريخ المصروف', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const expenseData = {
        amount: Number(amount),
        reason: reason.trim(),
        date: date,
        shop,
        updatedAt: new Date()
      };

      if (isEditing && editingId) {
        // Update existing expense
        await updateDoc(doc(db, 'expenses', editingId), expenseData);
        showToast('تم تحديث المصروف بنجاح', 'success');
      } else {
        // Add new expense
        expenseData.createdAt = new Date();
        await addDoc(collection(db, 'expenses'), expenseData);
        showToast('تم إضافة المصروف بنجاح', 'success');
      }

      // Reset form
      setAmount('');
      setReason('');
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setIsEditing(false);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error('خطأ أثناء حفظ المصروف:', error);
      showToast('حدث خطأ أثناء حفظ المصروف', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (isDeleting) return;

    setIsDeleting(true);
    setDeletingId(id);

    try {
      await deleteDoc(doc(db, 'expenses', id));
      showToast('تم حذف المصروف بنجاح', 'success');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('خطأ أثناء حذف المصروف:', error);
      showToast('حدث خطأ أثناء حذف المصروف', 'error');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const handleCancelForm = () => {
    setAmount('');
    setReason('');
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    setIsEditing(false);
    setEditingId(null);
    setShowForm(false);
  };

  const handleDeleteAllExpenses = async () => {
    if (!shop || isDeletingAll) return;

    setIsDeletingAll(true);
    try {
      const q = query(collection(db, 'expenses'), where('shop', '==', shop));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      showToast('تم حذف جميع المصاريف بنجاح', 'success');
      setDeleteAllExpensesConfirm(false);
    } catch (error) {
      console.error('خطأ أثناء حذف المصاريف:', error);
      showToast('حدث خطأ أثناء حذف المصاريف', 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
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
            <h1 className={styles.pageTitle}>المصاريف</h1>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={handleAddExpense}
              className={styles.addButton}
              disabled={isSaving || isDeleting || isDeletingAll}
            >
              <TbPlus /> إضافة مصروف
            </button>
            <button
              onClick={() => setDeleteAllExpensesConfirm(true)}
              className={styles.deleteAllButton}
              disabled={isDeletingAll || isSaving || isDeleting || expenses.length === 0}
            >
              <TbTrash /> حذف جميع المصاريف
            </button>
          </div>
        </div>

        {!showForm && (
          <>
            <div className={styles.toolbar}>
              <div className={styles.searchContainer}>
                <TbSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="ابحث عن المصاريف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              {totalExpenses > 0 && (
                <div className={styles.totalContainer}>
                  <span className={styles.totalLabel}>إجمالي المصاريف:</span>
                  <span className={styles.totalAmount}>
                    {totalExpenses.toLocaleString('en-US')} جنيه
                  </span>
                </div>
              )}
            </div>

            {filteredExpenses.length === 0 ? (
              <EmptyState
                icon={<TbReceipt />}
                title="لا توجد مصاريف"
                message={searchTerm ? "لم يتم العثور على مصاريف مطابقة للبحث" : "لم يتم إضافة أي مصاريف بعد"}
              />
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>التسلسل</th>
                      <th>التاريخ</th>
                      <th>المبلغ</th>
                      <th>السبب</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense, index) => (
                      <tr key={expense.id} className={styles.row}>
                        <td>{index + 1}</td>
                        <td>{formatDate(expense.date)}</td>
                        <td className={styles.moneyCell}>
                          {Number(expense.amount || 0).toLocaleString('en-US')} جنيه
                        </td>
                        <td>{expense.reason || '-'}</td>
                        <td className={styles.actionsCell}>
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className={styles.editButton}
                            title="تعديل المصروف"
                            disabled={isDeleting || isSaving}
                          >
                            <TbEdit />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(expense)}
                            className={styles.deleteButton}
                            title="حذف المصروف"
                            disabled={isDeleting || isSaving}
                          >
                            {isDeleting && deletingId === expense.id ? (
                              <span className={styles.spinner}></span>
                            ) : (
                              <TbTrash />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {showForm && (
          <div className={styles.formContainer}>
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>
                  {isEditing ? 'تعديل مصروف' : 'إضافة مصروف جديد'}
                </h2>
                <button
                  className={styles.closeButton}
                  onClick={handleCancelForm}
                  disabled={isSaving}
                >
                  <HiX />
                </button>
              </div>

              <div className={styles.formContent}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <TbCurrencyDollar className={styles.labelIcon} />
                    المبلغ
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setAmount(value);
                    }}
                    placeholder="0"
                    dir="ltr"
                    style={{ textAlign: 'left', fontFamily: 'Courier New, monospace' }}
                    disabled={isSaving}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <TbFileText className={styles.labelIcon} />
                    السبب
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="أدخل سبب المصروف"
                    disabled={isSaving}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <TbCalendar className={styles.labelIcon} />
                    التاريخ
                  </label>
                  <input
                    type="date"
                    className={styles.input}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className={styles.formFooter}>
                <button
                  className={styles.cancelButton}
                  onClick={handleCancelForm}
                  disabled={isSaving}
                >
                  إلغاء
                </button>
                <SafeButton
                  onClick={handleSaveExpense}
                  loading={isSaving}
                  disabled={isSaving}
                >
                  {isEditing ? 'تحديث' : 'إضافة'}
                </SafeButton>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            handleDeleteExpense(deleteConfirm.id);
          }
        }}
        title="حذف المصروف"
        message={`هل أنت متأكد من حذف هذا المصروف؟`}
        type="danger"
        loading={isDeleting && deletingId === deleteConfirm?.id}
        disabled={isDeleting}
      />

      <ConfirmModal
        isOpen={deleteAllExpensesConfirm}
        onClose={() => setDeleteAllExpensesConfirm(false)}
        onConfirm={handleDeleteAllExpenses}
        title="حذف جميع المصاريف"
        message="هل أنت متأكد من حذف جميع المصاريف؟ لا يمكن التراجع عن هذا الإجراء."
        type="danger"
        loading={isDeletingAll}
        disabled={isDeletingAll}
      />
    </>
  );
}

export default function ExpensesPage() {
  return (
    <MainLayout>
      <ExpensesPageContent />
    </MainLayout>
  );
}

