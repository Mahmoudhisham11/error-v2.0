'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import MainLayout, { useSidebar } from '@/components/Layout/MainLayout/MainLayout';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import OperationForm from '@/components/Operations/OperationForm/OperationForm';
import LineSelector from '@/components/Operations/LineSelector/LineSelector';
import OperationsList from '@/components/Operations/OperationsList/OperationsList';
import ConfirmModal from '@/components/ui/ConfirmModal/ConfirmModal';
import { useToast } from '@/components/ui/Toast/ToastProvider';
import { TbSearch } from 'react-icons/tb';
import { HiMenu, HiX } from 'react-icons/hi';
import { collection, addDoc, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './styles.module.css';

function OperationsPageContent() {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useSidebar();
  const { showToast } = useToast();
  const headerRef = useRef(null);
  const [cards, setCards] = useState([]);
  const [operations, setOperations] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosingDay, setIsClosingDay] = useState(false);
  const [deletingOperationId, setDeletingOperationId] = useState(null);
  const [showCloseDayModal, setShowCloseDayModal] = useState(false);
  const [shop, setShop] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [commation, setCommation] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('ارسال');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageShop = localStorage.getItem('shop');
      if (!storageShop) {
        window.location.href = '/';
        return;
      }
      setShop(storageShop);

      const q = query(collection(db, 'cards'), where('shop', '==', storageShop));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const cardsArray = [];
        querySnapshot.forEach((doc) => {
          cardsArray.push({ ...doc.data(), id: doc.id });
        });
        setCards(cardsArray);
      });

      const operationsQ = query(collection(db, 'operations'), where('shop', '==', storageShop));
      const unsubscribeOper = onSnapshot(operationsQ, (querySnapshot) => {
        const operationsArray = [];
        querySnapshot.forEach((doc) => {
          operationsArray.push({ ...doc.data(), id: doc.id });
        });
        operationsArray.sort((a, b) => new Date(a.date) - new Date(b.date));
        setOperations(operationsArray);
      });

      return () => {
        unsubscribe();
        unsubscribeOper();
      };
    }
  }, []);

  const total = useMemo(() => {
    return operations.reduce((acc, operation) => acc + Number(operation.commation || 0), 0);
  }, [operations]);

  const selectedCard = useMemo(() => {
    return cards.find(card => card.phone === phone);
  }, [cards, phone]);

  const handlePhoneChange = useCallback(async (e) => {
    const value = e.target.value;
    setPhone(value);
    if (!value) {
      return;
    }
  }, []);

  const validateOperation = useCallback(() => {
    if (!phone || amount === '' || amount === null || amount === undefined || commation === '' || commation === null || commation === undefined) {
      showToast('برجاء ادخال كل البيانات قبل تنفيذ العملية', 'error');
      return false;
    }

    const amountNum = Number(amount);
    const commationNum = Number(commation);

    if (isNaN(amountNum) || isNaN(commationNum) || amountNum <= 0 || commationNum < 0) {
      showToast("يجب أن يكون المبلغ رقمًا صحيحًا موجبًا والعمولة صفر أو أكثر", "error");
      return false;
    }

    if (!selectedCard) {
      showToast("الخط المحدد غير موجود", "error");
      return false;
    }

    if (type === 'ارسال') {
      if (amountNum > Number(selectedCard.amount || 0)) {
        showToast("الرصيد الحالي غير كافي لتنفيذ الإرسال", "error");
        return false;
      }
      if (amountNum > Number(selectedCard.depositLimit || 0)) {
        showToast("تم تجاوز حد الإرسال المسموح", "error");
        return false;
      }
    } else if (type === 'استلام') {
      if (amountNum > Number(selectedCard.withdrawLimit || 0)) {
        showToast("تم تجاوز حد الاستلام المسموح", "error");
        return false;
      }
    }

    return true;
  }, [phone, amount, commation, type, selectedCard, showToast]);

  const prepareConfirmDetails = useCallback(() => {
    if (!selectedCard) return null;

    const amountNum = Number(amount);
    const commationNum = Number(commation);
    const currentAmount = Number(selectedCard.amount || 0);
    const currentDepositLimit = Number(selectedCard.depositLimit || 0);
    const currentWithdrawLimit = Number(selectedCard.withdrawLimit || 0);

    let balanceAfter = currentAmount;
    let depositLimitAfter = currentDepositLimit;
    let withdrawLimitAfter = currentWithdrawLimit;

    if (type === 'ارسال') {
      balanceAfter = currentAmount - amountNum;
      depositLimitAfter = currentDepositLimit - amountNum;
    } else {
      balanceAfter = currentAmount + amountNum;
      withdrawLimitAfter = currentWithdrawLimit - amountNum;
    }

    const netAmount = type === "ارسال"
      ? amountNum + commationNum
      : amountNum - commationNum;

    return {
      type,
      balanceBefore: currentAmount,
      balanceAfter,
      depositLimitBefore: currentDepositLimit,
      depositLimitAfter,
      withdrawLimitBefore: currentWithdrawLimit,
      withdrawLimitAfter,
      amount: amountNum,
      commation: commationNum,
      netAmount,
      phone: selectedCard.phone,
      userName: selectedCard.userName
    };
  }, [selectedCard, amount, commation, type]);

  const handleSubmitClick = useCallback(() => {
    if (!validateOperation()) return;

    const details = prepareConfirmDetails();
    setConfirmDetails(details);
    setShowConfirmModal(true);
  }, [validateOperation, prepareConfirmDetails]);

  const executeOperation = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setShowConfirmModal(false);

    try {
      const amountNum = Number(amount);
      const commationNum = Number(commation);

      const q = query(collection(db, 'cards'), where('shop', '==', shop), where('phone', '==', phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const cardDoc = querySnapshot.docs[0];
        const cardRef = doc(db, 'cards', cardDoc.id);
        const cardData = cardDoc.data();

        let currentAmount = Number(cardData.amount);
        let currentDepositLimit = Number(cardData.depositLimit);
        let currentWithdrawLimit = Number(cardData.withdrawLimit);

        if (type === 'ارسال') {
          currentAmount -= amountNum;
          currentDepositLimit -= amountNum;
        } else if (type === 'استلام') {
          currentAmount += amountNum;
          currentWithdrawLimit -= amountNum;
        }

        await addDoc(collection(db, 'operations'), {
          phone,
          name,
          amount: amountNum,
          commation: commationNum,
          shop,
          type,
          date: new Date().toISOString(),
          amountBefore: cardData.amount
        });

        await updateDoc(cardRef, {
          amount: currentAmount,
          depositLimit: currentDepositLimit,
          withdrawLimit: currentWithdrawLimit
        });

        // تحديث رصيد النقدي
        const cashQuery = query(collection(db, 'cash'), where('shop', '==', shop));
        const cashSnapshot = await getDocs(cashQuery);

        let cashRef;
        let currentCashAmount = 0;

        if (!cashSnapshot.empty) {
          cashRef = doc(db, 'cash', cashSnapshot.docs[0].id);
          currentCashAmount = Number(cashSnapshot.docs[0].data().amount || 0);
        } else {
          // إنشاء cash document جديد
          const newCashDoc = await addDoc(collection(db, 'cash'), {
            shop,
            amount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          cashRef = doc(db, 'cash', newCashDoc.id);
        }

        // حساب الرصيد الجديد
        let newCashAmount = currentCashAmount;
        if (type === 'ارسال') {
          newCashAmount = currentCashAmount + amountNum;
        } else if (type === 'استلام') {
          newCashAmount = currentCashAmount - amountNum;
          // التحقق من عدم وجود رصيد سالب
          if (newCashAmount < 0) {
            showToast("رصيد النقدي غير كافي", "error");
            setIsProcessing(false);
            return;
          }
        }

        // تحديث النقدي
        await updateDoc(cashRef, {
          amount: newCashAmount,
          updatedAt: new Date()
        });

        setPhone('');
        setAmount('');
        setCommation('');
        setName('');
        setShowForm(false);
        showToast("تم تنفيذ العملية بنجاح", "success");
      }
    } catch (error) {
      console.error("خطأ أثناء تنفيذ العملية:", error);
      showToast("حدث خطأ أثناء تنفيذ العملية", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [phone, amount, commation, name, type, shop, isProcessing, showToast]);

  const handleDeleteOperation = useCallback(async (id) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    setDeletingOperationId(id);
    
    try {
      const operationRef = doc(db, 'operations', id);
      const operationSnap = await getDoc(operationRef);

      if (!operationSnap.exists()) {
        showToast("العملية غير موجودة", "error");
        return;
      }

      const operation = operationSnap.data();

      const cardQuery = query(
        collection(db, 'cards'),
        where('shop', '==', shop),
        where('phone', '==', operation.phone)
      );
      const cardSnap = await getDocs(cardQuery);

      if (cardSnap.empty) {
        showToast("لم يتم العثور على الخط المرتبط بالعملية", "error");
        return;
      }

      const cardDoc = cardSnap.docs[0];
      const cardRef = doc(db, 'cards', cardDoc.id);
      const cardData = cardDoc.data();

      let newAmount = Number(cardData.amount);
      let newDepositLimit = Number(cardData.depositLimit);
      let newWithdrawLimit = Number(cardData.withdrawLimit);
      const operationAmount = Number(operation.amount);

      if (operation.type === 'ارسال') {
        newAmount += operationAmount;
        newDepositLimit += operationAmount;
      } else if (operation.type === 'استلام') {
        if (newAmount - operationAmount < 0) {
          showToast("لا يمكن حذف العملية لأن ذلك سيؤدي إلى رصيد سالب.", "error");
          return;
        }
        newAmount -= operationAmount;
        newWithdrawLimit += operationAmount;
      }

      await updateDoc(cardRef, {
        amount: newAmount,
        withdrawLimit: newWithdrawLimit,
        depositLimit: newDepositLimit
      });

      // تحديث رصيد النقدي (عكس العملية)
      const cashQuery = query(collection(db, 'cash'), where('shop', '==', shop));
      const cashSnapshot = await getDocs(cashQuery);

      if (!cashSnapshot.empty) {
        const cashRef = doc(db, 'cash', cashSnapshot.docs[0].id);
        const currentCashAmount = Number(cashSnapshot.docs[0].data().amount || 0);
        
        let newCashAmount = currentCashAmount;
        if (operation.type === 'ارسال') {
          // حذف عملية إرسال: تقليل النقدي (إرجاع المبلغ)
          newCashAmount = currentCashAmount - operationAmount;
          if (newCashAmount < 0) {
            showToast("لا يمكن حذف العملية لأن ذلك سيؤدي إلى رصيد نقدي سالب", "error");
            setIsDeleting(false);
            setDeletingOperationId(null);
            return;
          }
        } else if (operation.type === 'استلام') {
          // حذف عملية استلام: زيادة النقدي (إرجاع المبلغ)
          newCashAmount = currentCashAmount + operationAmount;
        }
        
        await updateDoc(cashRef, {
          amount: newCashAmount,
          updatedAt: new Date()
        });
      }

      await deleteDoc(operationRef);
      showToast("تم حذف العملية وتعديل الرصيد بنجاح", "success");
    } catch (error) {
      console.error("حدث خطأ أثناء حذف العملية:", error);
      showToast("حدث خطأ أثناء حذف العملية", "error");
    } finally {
      setIsDeleting(false);
      setDeletingOperationId(null);
    }
  }, [shop, isDeleting, showToast]);

  const handleCloseDayClick = useCallback(() => {
    setShowCloseDayModal(true);
  }, []);

  const handleCloseDay = useCallback(async () => {
    if (isClosingDay) return;

    setIsClosingDay(true);
    setShowCloseDayModal(false);

    try {
      const querySnapshot = await getDocs(query(collection(db, "operations"), where('shop', '==', shop)));

      const addToReports = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return addDoc(collection(db, "reports"), {
          ...data,
          date: new Date().toISOString().split("T")[0]
        });
      });

      const deletePromises = querySnapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, "operations", docSnap.id))
      );

      await Promise.all([...addToReports, ...deletePromises]);
      showToast("تم تقفيل اليوم بنجاح", "success");
    } catch (error) {
      console.error("خطأ أثناء تقفيل اليوم:", error);
      showToast("حدث خطأ أثناء تقفيل اليوم", "error");
    } finally {
      setIsClosingDay(false);
    }
  }, [shop, isClosingDay, showToast]);

  const confirmModalDetails = useMemo(() => {
    if (!confirmDetails) return [];
    return [
      { label: 'نوع العملية', value: confirmDetails.type },
      { label: 'الخط', value: `${confirmDetails.userName} (${confirmDetails.phone})` },
      { label: 'المبلغ', value: `${confirmDetails.amount.toLocaleString('en-US')} جنيه` },
      { label: 'العمولة', value: `${confirmDetails.commation.toLocaleString('en-US')} جنيه` },
      { label: 'صافي المبلغ', value: `${confirmDetails.netAmount.toLocaleString('en-US')} جنيه` },
      { label: 'الرصيد قبل', value: `${confirmDetails.balanceBefore.toLocaleString('en-US')} جنيه` },
      { label: 'الرصيد بعد', value: `${confirmDetails.balanceAfter.toLocaleString('en-US')} جنيه` },
      { label: 'حد الإرسال بعد', value: `${confirmDetails.depositLimitAfter.toLocaleString('en-US')} جنيه` },
      { label: 'حد الاستلام بعد', value: `${confirmDetails.withdrawLimitAfter.toLocaleString('en-US')} جنيه` }
    ];
  }, [confirmDetails]);

  const filteredOperations = useMemo(() => {
    if (!searchTerm) return operations;
    return operations.filter(op => 
      op.phone?.toString().includes(searchTerm) ||
      op.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [operations, searchTerm]);

  const handleToggleView = () => {
    if (showForm) {
      // Reset form when going back to table view
      setPhone('');
      setAmount('');
      setCommation('');
      setName('');
    }
    setShowForm(!showForm);
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
            <h1 className={styles.pageTitle}>العمليات</h1>
          </div>
          <div className={styles.headerActions}>
            {!showForm && (
              <button 
                onClick={handleCloseDayClick}
                className={styles.closeDayButton}
                disabled={isClosingDay || isDeleting || isProcessing}
              >
                تقفيل اليوم
              </button>
            )}
            <button 
              onClick={handleToggleView}
              className={styles.addButton}
            >
              {showForm ? 'العمليات اليومية' : '+ إضافة عملية'}
            </button>
          </div>
        </div>

        {!showForm && (
          <div className={styles.toolbar}>
            <div className={styles.searchContainer}>
              <TbSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="ابحث عن العمليات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
        )}

        {showForm ? (
          <div className={styles.formContainer}>
            <div className={styles.formSection}>
              <LineSelector
                cards={cards}
                selectedPhone={phone}
                onPhoneChange={handlePhoneChange}
                selectedCard={selectedCard}
              />
            </div>

            <div className={styles.formSection}>
              <OperationForm
                type={type}
                onTypeChange={setType}
                phone={phone}
                onPhoneChange={handlePhoneChange}
                name={name}
                onNameChange={setName}
                amount={amount}
                onAmountChange={setAmount}
                commation={commation}
                onCommationChange={setCommation}
                selectedCard={selectedCard}
                isProcessing={isProcessing}
                onSubmit={handleSubmitClick}
                onCloseDay={handleCloseDay}
              />
            </div>
          </div>
        ) : (
          <OperationsList
            operations={filteredOperations}
            onDelete={handleDeleteOperation}
            isDeleting={isDeleting}
            deletingId={deletingOperationId}
          />
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeOperation}
        title="تأكيد العملية"
        message={`هل أنت متأكد من تنفيذ عملية ${type}؟`}
        type={type === 'ارسال' ? 'danger' : 'safe'}
        details={confirmModalDetails}
        loading={isProcessing}
        disabled={isProcessing}
      />

      <ConfirmModal
        isOpen={showCloseDayModal}
        onClose={() => setShowCloseDayModal(false)}
        onConfirm={handleCloseDay}
        title="تقفيل اليوم"
        message="هل تريد تقفيل اليوم؟ سيتم نقل جميع العمليات إلى التقارير."
        type="danger"
        loading={isClosingDay}
        disabled={isClosingDay}
      />
    </>
  );
}

export default function OperationsPage() {
  return (
    <MainLayout>
      <OperationsPageContent />
    </MainLayout>
  );
}

