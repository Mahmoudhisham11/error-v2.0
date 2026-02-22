'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import MainLayout, { useSidebar } from '@/components/Layout/MainLayout/MainLayout';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import OperationForm from '@/components/Operations/OperationForm/OperationForm';
import LineSelector from '@/components/Operations/LineSelector/LineSelector';
import MachineSelector from '@/components/Operations/MachineSelector/MachineSelector';
import OperationsList from '@/components/Operations/OperationsList/OperationsList';
import ConfirmModal from '@/components/ui/ConfirmModal/ConfirmModal';
import StatCard from '@/components/ui/StatCard/StatCard';
import { useToast } from '@/components/ui/Toast/ToastProvider';
import { TbSearch, TbTrendingUp, TbReceipt, TbMoneybag, TbDeviceDesktop, TbPhone, TbArrowsExchange, TbUser, TbCoins, TbCurrencyDollar } from 'react-icons/tb';
import { HiMenu, HiX } from 'react-icons/hi';
import { collection, addDoc, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where, runTransaction, limit } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './styles.module.css';

function OperationsPageContent() {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useSidebar();
  const { showToast } = useToast();
  const headerRef = useRef(null);
  const [cards, setCards] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operations, setOperations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [cash, setCash] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosingDay, setIsClosingDay] = useState(false);
  const [deletingOperationId, setDeletingOperationId] = useState(null);
  const [showCloseDayModal, setShowCloseDayModal] = useState(false);
  const [shop, setShop] = useState('');
  const [operationSource, setOperationSource] = useState('line'); // 'line' or 'machine'
  const [phone, setPhone] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [machineOperationType, setMachineOperationType] = useState('deposit');
  const [delegateName, setDelegateName] = useState('');
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

      // Subscribe to machines
      const machinesQ = query(collection(db, 'machines'), where('shop', '==', storageShop));
      const unsubscribeMachines = onSnapshot(machinesQ, (querySnapshot) => {
        const machinesArray = [];
        querySnapshot.forEach((doc) => {
          machinesArray.push({ ...doc.data(), id: doc.id });
        });
        setMachines(machinesArray);
      });

      // Subscribe to cash
      const cashQ = query(collection(db, 'cash'), where('shop', '==', storageShop));
      const unsubscribeCash = onSnapshot(cashQ, (snapshot) => {
        if (!snapshot.empty) {
          const cashDoc = snapshot.docs[0];
          setCash({ ...cashDoc.data(), id: cashDoc.id });
        } else {
          setCash(null);
        }
      });

      // Query operations including both line and machine operations
      // Note: We filter closed operations in JavaScript to support old operations without 'closed' field
      const operationsQ = query(
        collection(db, 'operations'),
        where('shop', '==', storageShop)
      );
      const unsubscribeOper = onSnapshot(operationsQ, (querySnapshot) => {
        const operationsArray = [];
        querySnapshot.forEach((doc) => {
          operationsArray.push({ ...doc.data(), id: doc.id });
        });
        operationsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
        setOperations(operationsArray);
      });

      return () => {
        unsubscribe();
        unsubscribeMachines();
        unsubscribeCash();
        unsubscribeOper();
        // No need to unsubscribe - we're using getDocs, not onSnapshot
      };
    }
  }, []);

  useEffect(() => {
    if (shop) {
      const expensesQ = query(
        collection(db, 'expenses'),
        where('shop', '==', shop)
      );
      const unsubscribe = onSnapshot(expensesQ, (snapshot) => {
        const expensesArray = [];
        snapshot.forEach((doc) => {
          expensesArray.push({ ...doc.data(), id: doc.id });
        });
        setExpenses(expensesArray);
      });
      return () => unsubscribe();
    }
  }, [shop]);

  const total = useMemo(() => {
    return operations.reduce((acc, operation) => acc + Number(operation.commation || 0), 0);
  }, [operations]);

  const totalProfit = useMemo(() => {
    return operations
      .filter(op => !op.closed || op.closed === false)  // Support old operations without 'closed' field
      .reduce((acc, op) => acc + Number(op.commation || 0), 0);
  }, [operations]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
  }, [expenses]);

  const netProfit = useMemo(() => {
    return totalProfit - totalExpenses;
  }, [totalExpenses, totalProfit]);

  const selectedCard = useMemo(() => {
    return cards.find(card => card.phone === phone);
  }, [cards, phone]);

  const selectedMachine = useMemo(() => {
    return machines.find(m => m.id === selectedMachineId);
  }, [machines, selectedMachineId]);

  const handlePhoneChange = useCallback(async (e) => {
    const value = e.target.value;
    setPhone(value);
    if (!value) {
      return;
    }
  }, []);

  const validateOperation = useCallback(async () => {
    const amountNum = Number(amount);
    
    if (amount === '' || amount === null || amount === undefined || isNaN(amountNum) || amountNum <= 0) {
      showToast('برجاء إدخال مبلغ صحيح', 'error');
      return false;
    }

    // Validate line operations
    if (operationSource === 'line') {
      if (!phone || commation === '' || commation === null || commation === undefined) {
        showToast('برجاء ادخال كل البيانات قبل تنفيذ العملية', 'error');
        return false;
      }

      const commationNum = Number(commation);
      if (isNaN(commationNum) || commationNum < 0) {
        showToast("يجب أن تكون العمولة صفر أو أكثر", "error");
        return false;
      }

      if (!selectedCard) {
        showToast("الخط المحدد غير موجود", "error");
        return false;
      }

      // التحقق من رصيد المحافظ
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

      // التحقق من رصيد النقدي (لعملية الاستلام فقط)
      if (type === 'استلام') {
        const currentCashAmount = cash?.amount || 0;
        if (currentCashAmount < amountNum) {
          showToast("رصيد النقدي غير كافي لتنفيذ عملية الاستلام", "error");
          return false;
        }
      }
    } 
    // Validate machine operations
    else if (operationSource === 'machine') {
      if (!selectedMachineId || !selectedMachine) {
        showToast('برجاء اختيار الماكينة', 'error');
        return false;
      }

      if (selectedMachine.isActive === false) {
        showToast('الماكينة المحددة معطلة', 'error');
        return false;
      }

      if (machineOperationType === 'deposit') {
        // For deposit, check cash availability and delegate name
        if (!delegateName || !delegateName.trim()) {
          showToast('برجاء إدخال اسم المندوب', 'error');
          return false;
        }

        const currentCashAmount = cash?.amount || 0;
        if (currentCashAmount < amountNum) {
          showToast('رصيد النقدي غير كافي لتنفيذ عملية الإيداع', 'error');
          return false;
        }
      } else {
        // For other operations, check machine balance and commission
        if (commation === '' || commation === null || commation === undefined) {
          showToast('برجاء إدخال العمولة', 'error');
          return false;
        }

        const commationNum = Number(commation);
        if (isNaN(commationNum) || commationNum < 0) {
          showToast('يجب أن تكون العمولة صفر أو أكثر', 'error');
          return false;
        }

        const currentBalance = Number(selectedMachine.balance || 0);
        if (currentBalance < amountNum) {
          showToast('رصيد الماكينة غير كافي', 'error');
          return false;
        }
      }
    }

    return true;
  }, [operationSource, phone, selectedCard, selectedMachineId, selectedMachine, amount, commation, type, machineOperationType, delegateName, cash, shop, showToast]);

  const prepareConfirmDetails = useCallback(() => {
    const amountNum = Number(amount);

    if (operationSource === 'line') {
      if (!selectedCard) return null;

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
        source: 'line',
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
    } else {
      if (!selectedMachine) return null;

      const commationNum = machineOperationType === 'deposit' ? 0 : Number(commation);
      const currentBalance = Number(selectedMachine.balance || 0);
      const currentCash = cash?.amount || 0;

      let balanceAfter = currentBalance;
      let cashAfter = currentCash;

      if (machineOperationType === 'deposit') {
        balanceAfter = currentBalance + amountNum;
        cashAfter = currentCash - amountNum;
      } else {
        balanceAfter = currentBalance - amountNum;
        cashAfter = currentCash + amountNum;
      }

      const operationTypeLabels = {
        deposit: 'إيداع',
        withdraw: 'سحب',
        transfer: 'تحويل',
        topup: 'شحن',
        bill: 'فاتورة'
      };

      return {
        source: 'machine',
        operationType: operationTypeLabels[machineOperationType] || machineOperationType,
        machineName: selectedMachine.name,
        machineCode: selectedMachine.code,
        amount: amountNum,
        commission: commationNum,
        delegateName: delegateName || '-',
        balanceBefore: currentBalance,
        balanceAfter,
        cashBefore: currentCash,
        cashAfter
      };
    }
  }, [operationSource, selectedCard, selectedMachine, amount, commation, type, machineOperationType, delegateName, cash]);

  const handleSubmitClick = useCallback(async () => {
    const isValid = await validateOperation();
    if (!isValid) return;

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

      if (operationSource === 'line') {
        // Line operation logic
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
            source: 'line',
            phone,
            name,
            amount: amountNum,
            commation: commationNum,
            shop,
            type,
            date: new Date().toISOString(),
            amountBefore: cardData.amount,
            closed: false
          });

          await updateDoc(cardRef, {
            amount: currentAmount,
            depositLimit: currentDepositLimit,
            withdrawLimit: currentWithdrawLimit
          });

          // تحديث رصيد النقدي
          let cashRef;
          let currentCashAmount = 0;

          if (!cash || !cash.id) {
            const newCashDoc = await addDoc(collection(db, 'cash'), {
              shop,
              amount: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            cashRef = doc(db, 'cash', newCashDoc.id);
          } else {
            cashRef = doc(db, 'cash', cash.id);
            currentCashAmount = Number(cash.amount || 0);
          }

          // حساب الرصيد الجديد
          let newCashAmount = currentCashAmount;
          if (type === 'ارسال') {
            newCashAmount = currentCashAmount + amountNum;
          } else if (type === 'استلام') {
            newCashAmount = currentCashAmount - amountNum;
            if (newCashAmount < 0) {
              showToast("رصيد النقدي غير كافي", "error");
              setIsProcessing(false);
              return;
            }
          }

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
      } else if (operationSource === 'machine') {
        // Machine operation logic
        const commissionNum = machineOperationType === 'deposit' ? 0 : Number(commation);
        
        // Use data from state instead of reading from Firestore
        if (!selectedMachine) {
          showToast('الماكينة غير موجودة', 'error');
          setIsProcessing(false);
          return;
        }

        const machineRef = doc(db, 'machines', selectedMachineId);
        
        // Get cash reference - use existing cash from state if available
        let cashRef;
        if (!cash || !cash.id) {
          // Only create if it doesn't exist
          const newCashDoc = await addDoc(collection(db, 'cash'), {
            shop,
            amount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          cashRef = doc(db, 'cash', newCashDoc.id);
        } else {
          cashRef = doc(db, 'cash', cash.id);
        }

        // Use transaction for atomic updates - read everything inside transaction
        // Store balance values from transaction to use when creating transaction record
        let balanceBefore = 0;
        let balanceAfter = 0;
        
        await runTransaction(db, async (transaction) => {
          // Read documents inside transaction only
          const machineSnapTrans = await transaction.get(machineRef);
          const cashSnapTrans = await transaction.get(cashRef);

          if (!machineSnapTrans.exists()) {
            throw new Error('الماكينة غير موجودة');
          }

          const machineDataTrans = machineSnapTrans.data();
          const currentBalanceTrans = Number(machineDataTrans.balance || 0);
          const currentCashTrans = Number(cashSnapTrans.data()?.amount || 0);

          // Store balance before for transaction record
          balanceBefore = currentBalanceTrans;

          let newBalance = currentBalanceTrans;
          let newCash = currentCashTrans;

          if (machineOperationType === 'deposit') {
            // Deposit: machine balance increases, cash decreases
            newBalance = currentBalanceTrans + amountNum;
            newCash = currentCashTrans - amountNum;

            if (newCash < 0) {
              throw new Error('رصيد النقدي غير كافي');
            }
          } else {
            // Other operations: machine balance decreases, cash increases
            newBalance = currentBalanceTrans - amountNum;
            newCash = currentCashTrans + amountNum;

            if (newBalance < 0) {
              throw new Error('رصيد الماكينة غير كافي');
            }
          }

          // Store balance after for transaction record
          balanceAfter = newBalance;

          // Update machine balance
          transaction.update(machineRef, {
            balance: newBalance
          });

          // Update cash
          transaction.update(cashRef, {
            amount: newCash,
            updatedAt: new Date()
          });
        });

        // Create transaction record in operations collection
        const transactionDate = new Date();
        const dateString = transactionDate.toISOString().split('T')[0];
        await addDoc(collection(db, 'operations'), {
          source: 'machine',
          phone: selectedMachine.code,
          name: machineOperationType === 'deposit' ? delegateName.trim() : selectedMachine.name,
          amount: amountNum,
          commation: commissionNum,
          type: machineOperationType,
          date: transactionDate.toISOString(),
          dateString: dateString,
          amountBefore: balanceBefore,
          shop,
          machineCode: selectedMachine.code,
          machineName: selectedMachine.name,
          balanceAfter: balanceAfter,
          closed: false
        });

        // Reset form
        setSelectedMachineId('');
        setAmount('');
        setCommation('');
        setDelegateName('');
        setShowForm(false);
        showToast('تم تنفيذ العملية بنجاح', 'success');
      }
    } catch (error) {
      console.error('خطأ أثناء تنفيذ العملية:', error);
      showToast(error.message || 'حدث خطأ أثناء تنفيذ العملية', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [operationSource, phone, selectedMachineId, selectedMachine, amount, commation, name, type, machineOperationType, delegateName, shop, cash, isProcessing, showToast]);

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
      const operationSource = operation.source || 'line';
      const operationAmount = Number(operation.amount);

      if (operationSource === 'machine') {
        // Handle machine operation deletion
        if (!operation.machineCode) {
          showToast("الماكينة غير موجودة في العملية", "error");
          return;
        }

        const machineQuery = query(
          collection(db, 'machines'),
          where('shop', '==', shop),
          where('code', '==', operation.machineCode)
        );
        const machineSnap = await getDocs(machineQuery);

        if (machineSnap.empty) {
          showToast("لم يتم العثور على الماكينة المرتبطة بالعملية", "error");
          return;
        }

        const machineDoc = machineSnap.docs[0];
        const machineRef = doc(db, 'machines', machineDoc.id);
        const machineData = machineDoc.data();
        const currentBalance = Number(machineData.balance || 0);

        // Get cash reference
        const cashQuery = query(collection(db, 'cash'), where('shop', '==', shop));
        const cashSnapshot = await getDocs(cashQuery);
        let cashRef;
        let currentCashAmount = 0;

        if (!cashSnapshot.empty) {
          cashRef = doc(db, 'cash', cashSnapshot.docs[0].id);
          currentCashAmount = Number(cashSnapshot.docs[0].data().amount || 0);
        } else {
          // Create cash if it doesn't exist
          const newCashDoc = await addDoc(collection(db, 'cash'), {
            shop,
            amount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          cashRef = doc(db, 'cash', newCashDoc.id);
        }

        // Reverse the operation: restore machine balance and cash
        let newBalance = currentBalance;
        let newCash = currentCashAmount;

        if (operation.type === 'deposit') {
          // Reverse deposit: decrease machine balance, increase cash
          newBalance = currentBalance - operationAmount;
          newCash = currentCashAmount + operationAmount;
          if (newBalance < 0) {
            showToast("لا يمكن حذف العملية لأن ذلك سيؤدي إلى رصيد ماكينة سالب", "error");
            return;
          }
        } else {
          // Reverse other operations: increase machine balance, decrease cash
          newBalance = currentBalance + operationAmount;
          newCash = currentCashAmount - operationAmount;
          if (newCash < 0) {
            showToast("لا يمكن حذف العملية لأن ذلك سيؤدي إلى رصيد نقدي سالب", "error");
            return;
          }
        }

        await runTransaction(db, async (transaction) => {
          const machineSnapTrans = await transaction.get(machineRef);
          const cashSnapTrans = await transaction.get(cashRef);

          if (!machineSnapTrans.exists()) {
            throw new Error('الماكينة غير موجودة');
          }

          transaction.update(machineRef, {
            balance: newBalance
          });

          transaction.update(cashRef, {
            amount: newCash,
            updatedAt: new Date()
          });
        });

        await deleteDoc(operationRef);
        showToast("تم حذف العملية وتعديل الرصيد بنجاح", "success");
      } else {
        // Handle line operation deletion (existing logic)
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
      }
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
      // نقل جميع العمليات (line + machine) إلى reports
      // Note: We filter closed operations in JavaScript to support old operations without 'closed' field
      const operationsQuery = query(
        collection(db, "operations"),
        where('shop', '==', shop)
      );
      const operationsSnapshot = await getDocs(operationsQuery);
      
      // Filter unclosed operations (supports old operations without 'closed' field)
      const unclosedOps = operationsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.closed || data.closed === false;
      });

      const addOperationsToReports = unclosedOps.map((docSnap) => {
        const data = docSnap.data();
        return addDoc(collection(db, "reports"), {
          ...data,
          date: new Date().toISOString().split("T")[0]
        });
      });

      const deleteOperations = unclosedOps.map((docSnap) =>
        deleteDoc(doc(db, "operations", docSnap.id))
      );

      // نقل المصاريف إلى expensesReports
      const expensesQuery = query(collection(db, "expenses"), where('shop', '==', shop));
      const expensesSnapshot = await getDocs(expensesQuery);

      const addExpensesToReports = expensesSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return addDoc(collection(db, "expensesReports"), {
          ...data,
          date: new Date().toISOString().split("T")[0],
          closedAt: new Date().toISOString()
        });
      });

      const deleteExpenses = expensesSnapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, "expenses", docSnap.id))
      );

      // تنفيذ جميع العمليات بالتوازي
      await Promise.all([
        ...addOperationsToReports,
        ...deleteOperations,
        ...addExpensesToReports,
        ...deleteExpenses
      ]);

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
    
    if (confirmDetails.source === 'line') {
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
    } else {
      return [
        { label: 'نوع العملية', value: confirmDetails.operationType },
        { label: 'الماكينة', value: `${confirmDetails.machineName} (${confirmDetails.machineCode})` },
        { label: 'المبلغ', value: `${confirmDetails.amount.toLocaleString('en-US')} جنيه` },
        { label: 'العمولة', value: `${confirmDetails.commission.toLocaleString('en-US')} جنيه` },
        { label: 'المندوب', value: confirmDetails.delegateName },
        { label: 'رصيد الماكينة قبل', value: `${confirmDetails.balanceBefore.toLocaleString('en-US')} جنيه` },
        { label: 'رصيد الماكينة بعد', value: `${confirmDetails.balanceAfter.toLocaleString('en-US')} جنيه` },
        { label: 'رصيد النقدي قبل', value: `${confirmDetails.cashBefore.toLocaleString('en-US')} جنيه` },
        { label: 'رصيد النقدي بعد', value: `${confirmDetails.cashAfter.toLocaleString('en-US')} جنيه` }
      ];
    }
  }, [confirmDetails]);

  const filteredOperations = useMemo(() => {
    if (!searchTerm) return operations;
    return operations.filter(op => 
      op.phone?.toString().includes(searchTerm) ||
      op.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [operations, searchTerm]);

  const allOperations = useMemo(() => {
    // All operations (line + machine) are now in operations collection
    // Filter closed operations in JavaScript to support old operations without 'closed' field
    return operations
      .filter(op => !op.closed || op.closed === false)  // Only unclosed operations (supports old operations)
      .map(op => ({
        ...op,
        source: op.source || 'line'  // Default to 'line' for backward compatibility
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [operations]);

  const handleToggleView = () => {
    if (showForm) {
      // Reset form when going back to table view
      setPhone('');
      setSelectedMachineId('');
      setAmount('');
      setCommation('');
      setName('');
      setDelegateName('');
      setOperationSource('line');
      setMachineOperationType('deposit');
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

        <div className={styles.statsGrid}>
          <StatCard
            title="الربح"
            value={`${totalProfit.toLocaleString('en-US')} جنيه`}
            icon={<TbTrendingUp />}
            color="success"
          />
          <StatCard
            title="إجمالي المصاريف"
            value={`${totalExpenses.toLocaleString('en-US')} جنيه`}
            icon={<TbReceipt />}
            color="danger"
          />
          <StatCard
            title="صافي الربح"
            value={`${netProfit.toLocaleString('en-US')} جنيه`}
            icon={<TbMoneybag />}
            color={netProfit >= 0 ? "success" : "danger"}
          />
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
              <div className={styles.sourceSelector}>
                <label className={styles.sourceLabel}>
                  <TbArrowsExchange className={styles.sourceIcon} />
                  نوع العملية:
                </label>
                <select
                  value={operationSource}
                  onChange={(e) => {
                    setOperationSource(e.target.value);
                    setPhone('');
                    setSelectedMachineId('');
                    setAmount('');
                    setCommation('');
                    setName('');
                    setDelegateName('');
                  }}
                  className={styles.sourceSelect}
                >
                  <option value="line">خط</option>
                  <option value="machine">ماكينة</option>
                </select>
              </div>

              {operationSource === 'line' ? (
                <LineSelector
                  cards={cards}
                  selectedPhone={phone}
                  onPhoneChange={handlePhoneChange}
                  selectedCard={selectedCard}
                />
              ) : (
                <div className={styles.machineFormSection}>
                  <MachineSelector
                    machines={machines}
                    selectedMachineId={selectedMachineId}
                    onMachineChange={setSelectedMachineId}
                    selectedMachine={selectedMachine}
                  />
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      <TbArrowsExchange className={styles.inputIcon} />
                      نوع العملية:
                    </label>
                    <select
                      value={machineOperationType}
                      onChange={(e) => {
                        setMachineOperationType(e.target.value);
                        setCommation('');
                        setDelegateName('');
                      }}
                      className={styles.select}
                      disabled={isProcessing}
                    >
                      <option value="deposit">إيداع</option>
                      <option value="withdraw">سحب</option>
                      <option value="transfer">تحويل</option>
                      <option value="topup">شحن</option>
                      <option value="bill">فاتورة</option>
                    </select>
                  </div>

                  {machineOperationType === 'deposit' && (
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>
                        <TbUser className={styles.inputIcon} />
                        اسم المندوب:
                      </label>
                      <input
                        type="text"
                        value={delegateName}
                        onChange={(e) => setDelegateName(e.target.value)}
                        placeholder="ادخل اسم المندوب"
                        disabled={isProcessing}
                        dir="rtl"
                        className={styles.textInput}
                      />
                    </div>
                  )}

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      <TbUser className={styles.inputIcon} />
                      اسم العميل:
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="اسم العميل"
                      disabled={isProcessing}
                      dir="rtl"
                      className={styles.textInput}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formSection}>
              {operationSource === 'line' ? (
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
              ) : (
                <div className={styles.machineForm}>
                  <div className={styles.formHeader}>
                    <h2 className={styles.formTitle}>
                      <TbArrowsExchange className={styles.titleIcon} />
                      نموذج العملية
                    </h2>
                  </div>
                  <div className={styles.formContent}>
                    <div className={styles.amountRow}>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>
                          <TbCurrencyDollar className={styles.inputIcon} />
                          المبلغ:
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={amount === '' || amount === null || amount === undefined ? '' : amount.toString()}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setAmount(val === '' ? '' : val);
                          }}
                          placeholder="0"
                          disabled={isProcessing}
                          dir="ltr"
                          className={styles.moneyInput}
                        />
                      </div>
                      {machineOperationType !== 'deposit' && (
                        <div className={styles.inputGroup}>
                          <label className={styles.inputLabel}>
                            <TbCoins className={styles.inputIcon} />
                            العمولة:
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={commation === '' || commation === null || commation === undefined ? '' : commation.toString()}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setCommation(val === '' ? '' : val);
                            }}
                            placeholder="0"
                            disabled={isProcessing}
                            dir="ltr"
                            className={styles.moneyInput}
                          />
                        </div>
                      )}
                    </div>
                    <div className={styles.formActions}>
                      <button
                        onClick={handleSubmitClick}
                        className={styles.submitButton}
                        disabled={isProcessing || !selectedMachineId || amount === ''}
                      >
                        {isProcessing ? 'جاري التنفيذ...' : 'تنفيذ العملية'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <OperationsList
            operations={allOperations}
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
        message={`هل أنت متأكد من تنفيذ العملية؟`}
        type={operationSource === 'line' && type === 'ارسال' ? 'danger' : 'safe'}
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

