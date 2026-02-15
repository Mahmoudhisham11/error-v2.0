'use client';
import { useEffect, useState, useMemo, useRef } from "react";
import MainLayout, { useSidebar } from "@/components/Layout/MainLayout/MainLayout";
import StatusBadge from "@/components/ui/StatusBadge/StatusBadge";
import LineProfileModal from "@/components/ui/LineProfileModal/LineProfileModal";
import ConfirmModal from "@/components/ui/ConfirmModal/ConfirmModal";
import MoneyInput from "@/components/ui/MoneyInput/MoneyInput";
import SafeButton from "@/components/ui/SafeButton/SafeButton";
import DangerButton from "@/components/ui/DangerButton/DangerButton";
import EmptyState from "@/components/ui/EmptyState/EmptyState";
import StatCard from "@/components/ui/StatCard/StatCard";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import { TbPhone, TbSearch, TbUser, TbId, TbCurrencyDollar, TbWallet, TbTrendingUp, TbTrendingDown, TbPlus, TbEdit, TbTrash } from "react-icons/tb";
import { HiMenu, HiX } from "react-icons/hi";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import styles from "./styles.module.css";

function CardsPageContent() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { showToast } = useToast();
  const headerRef = useRef(null);
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [userName, setUserName] = useState("");
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [shop, setShop] = useState("");
  const [search, setSearch] = useState("");
  const [deposit, setDeposit] = useState("");
  const [withdraw, setWithdraw] = useState("");
  const [total, setTotl] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageShop = localStorage.getItem("shop");
      const storageName = localStorage.getItem("userName");
      if (storageShop) {
        setShop(storageShop);
        setName(storageName);
      }

      let q;
      if (search !== '') {
        q = query(collection(db, 'cards'), where('shop', '==', storageShop), where('phone', '==', search));
      } else {
        q = query(collection(db, 'cards'), where('shop', '==', storageShop));
      }

      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const cardsArray = [];
        const now = new Date();
        const currentMonth = now.getMonth();

        for (const docSnap of querySnapshot.docs) {
          const card = { ...docSnap.data(), id: docSnap.id };

          if (!card.originalWithdrawLimit) {
            card.originalWithdrawLimit = Number(card.withdrawLimit) + Number(card.amount || 0);
            await updateDoc(doc(db, "cards", card.id), {
              originalWithdrawLimit: card.originalWithdrawLimit,
            });
          }

          if (!card.originalDepositLimit) {
            card.originalDepositLimit = Number(card.depositLimit || 0);
            await updateDoc(doc(db, "cards", card.id), {
              originalDepositLimit: card.originalDepositLimit,
            });
          }

          const lastReset = card.lastReset ? new Date(card.lastReset).getMonth() : null;
          if (lastReset !== currentMonth) {
            const cardRef = doc(db, "cards", docSnap.id);
            await updateDoc(cardRef, {
              depositLimit: card.originalDepositLimit,
              withdrawLimit: Math.max(0, Number(card.originalWithdrawLimit) - Number(card.amount || 0)),
              lastReset: new Date().toISOString(),
            });
            card.depositLimit = card.originalDepositLimit;
            card.withdrawLimit = card.originalWithdrawLimit;
            card.lastReset = new Date().toISOString();
          }

          cardsArray.push(card);
        }

        setCards(cardsArray);
      });

      return () => unsubscribe();
    }
  }, [search]);

  useEffect(() => {
    const subTotal = cards.reduce((acc, card) => acc + Number(card.amount), 0);
    setTotl(subTotal);
  }, [cards]);

  const canEdit = useMemo(() => {
    return [
      "محمد شعبان ايرور 3",
      "محمد شعبان ايرور 2",
      "محمد شعبان ايرور 1",
      "admin1"
    ].includes(name);
  }, [name]);

  const getLineStatus = (card) => {
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

  const handleAddPhone = async (e) => {
    if (e) {
      e.preventDefault();
    }

    // Validation
    if (!userName || !userName.trim()) {
      showToast("برجاء ادخال اسم المالك", "error");
      return;
    }

    if (!phone || !phone.toString().trim()) {
      showToast("برجاء ادخال رقم الشريحة", "error");
      return;
    }

    if (!amount || Number(amount) < 0) {
      showToast("برجاء ادخال الرصيد الحالي", "error");
      return;
    }

    if (!deposit || Number(deposit) < 0) {
      showToast("برجاء ادخال ليميت الارسال", "error");
      return;
    }

    if (!withdraw || Number(withdraw) < 0) {
      showToast("برجاء ادخال ليميت الاستلام", "error");
      return;
    }

        const amountNum = Number(amount);
        const withdrawNum = Number(withdraw);
        const depositNum = Number(deposit);

    if (isNaN(amountNum) || isNaN(withdrawNum) || isNaN(depositNum)) {
      showToast("برجاء ادخال أرقام صحيحة", "error");
      return;
    }

    try {
      if (isEditing && id) {
        setIsUpdating(true);
        await updateDoc(doc(db, "cards", id), {
          userName: userName.trim(),
          number: number.trim() || "",
          phone: phone.toString().trim(),
          amount: amountNum,
          depositLimit: depositNum,
          withdrawLimit: Math.max(0, withdrawNum - amountNum),
          originalDepositLimit: depositNum,
          originalWithdrawLimit: withdrawNum,
        });
        showToast("تم التعديل بنجاح", "success");
      } else {
        setIsAdding(true);
        await addDoc(collection(db, "cards"), {
          userName: userName.trim(),
        name,
          number: number.trim() || "",
          phone: phone.toString().trim(),
        amount: amountNum,
        shop,
        depositLimit: depositNum,
          withdrawLimit: Math.max(0, withdrawNum - amountNum),
        originalDepositLimit: depositNum,
        originalWithdrawLimit: withdrawNum,
        lastReset: new Date().toISOString(),
        });
        showToast("تم اضافة الخط بنجاح", "success");
      }

      // Reset form
        setUserName("");
        setNumber("");
        setPhone("");
        setAmount("");
        setWithdraw("");
        setDeposit("");
      setId("");
      setIsEditing(false);
      setShowForm(false);
    } catch (error) {
      console.error("Error saving card:", error);
      showToast(isEditing ? "حدث خطأ أثناء تعديل الخط. برجاء المحاولة مرة أخرى." : "حدث خطأ أثناء إضافة الخط. برجاء المحاولة مرة أخرى.", "error");
    } finally {
      setIsAdding(false);
      setIsUpdating(false);
    }
  };

  const handleDelete = (card) => {
    setDeleteConfirm(card);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        setIsDeleting(true);
        await deleteDoc(doc(db, "cards", deleteConfirm.id));
        showToast("تم حذف الخط بنجاح", "success");
        setDeleteConfirm(null);
      } catch (error) {
        console.error("Error deleting card:", error);
        showToast("حدث خطأ أثناء حذف الخط. برجاء المحاولة مرة أخرى.", "error");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEdit = (card) => {
    setId(card.id);
    setUserName(card.userName || "");
    setPhone(card.phone || "");
    setAmount(card.amount?.toString() || "");
    setNumber(card.number || "");
    setDeposit(card.originalDepositLimit?.toString() || card.depositLimit?.toString() || "");
    setWithdraw(card.originalWithdrawLimit?.toString() || "");
    setIsEditing(true);
    setShowForm(true);
  };

  const handleRowClick = (card) => {
    setSelectedLine(card);
    setOpenProfile(true);
  };

  const handleToggleView = () => {
    if (showForm) {
      // Reset form when going back to table view
    setUserName("");
      setNumber("");
    setPhone("");
    setAmount("");
      setWithdraw("");
      setDeposit("");
      setId("");
      setIsEditing(false);
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
            <h1 className={styles.pageTitle}>إدارة الخطوط</h1>
                    </div>
          <div className={styles.headerActions}>
            <button 
              onClick={handleToggleView}
              className={styles.addButton}
              disabled={isAdding || isUpdating || isDeleting}
            >
              {showForm ? 'كل الخطوط' : '+ إضافة خط جديد'}
            </button>
                    </div>
                    </div>

        {!showForm && (
          <div className={styles.toolbar}>
            <div className={styles.searchContainer}>
              <TbSearch className={styles.searchIcon} />
              <input
                type="number"
                placeholder="ابحث عن الرقم"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
                </div>
            </div>
        )}

        {!showForm && (
          <div className={styles.totalCard}>
            <StatCard
              title="إجمالي الرصيد"
              value={`${total.toLocaleString('en-US')} جنيه`}
              icon={<TbPhone />}
              color="primary"
            />
                </div>
        )}

        {!showForm && (
        <div className={styles.tableContainer}>
          {cards.length === 0 ? (
            <EmptyState
              icon={<TbPhone />}
              title="لا توجد خطوط"
              message="لم يتم إضافة أي خطوط بعد"
            />
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>التسلسل</th>
                                <th>اسم المالك</th>
                                <th>رقم الخط</th>
                                <th>يمكن ارسال</th>
                  <th>يمكن استلام</th>
                                <th>الرصيد الحالي</th>
                                <th>الرقم القومي</th>
                  <th>الحالة</th>
                  {canEdit && <th>التفاعل</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {cards.map((card, index) => (
                  <tr
                    key={card.id}
                    onClick={() => handleRowClick(card)}
                    className={styles.tableRow}
                  >
                                    <td>{index + 1}</td>
                                    <td>{card.userName}</td>
                    <td className={styles.phoneCell}>{card.phone}</td>
                    <td className={styles.moneyCell}>
                      {Number(card.depositLimit || 0).toLocaleString('en-US')}
                    </td>
                    <td className={styles.moneyCell}>
                      {Number(card.withdrawLimit || 0).toLocaleString('en-US')}
                    </td>
                    <td className={styles.moneyCell}>
                      {Number(card.amount || 0).toLocaleString('en-US')}
                    </td>
                                    <td>{card.number}</td>
                    <td>
                      <StatusBadge status={getLineStatus(card)}>
                        {getLineStatus(card) === 'blocked' ? 'محظور' :
                         getLineStatus(card) === 'warning' ? 'تحذير' : 'آمن'}
                      </StatusBadge>
                    </td>
                    {canEdit && (
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEdit(card)} className={styles.editBtn} disabled={isDeleting || isUpdating}>
                          {isUpdating && id === card.id ? (
                            <span className={styles.spinner}></span>
                          ) : (
                            <TbEdit />
                          )}
                        </button>
                        <button onClick={() => handleDelete(card)} className={styles.deleteBtn} disabled={isDeleting || isUpdating}>
                          {isDeleting && deleteConfirm?.id === card.id ? (
                            <span className={styles.spinner}></span>
                          ) : (
                            <TbTrash />
                          )}
                        </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
          )}
        </div>
      )}

        {canEdit && showForm && (
          <div className={styles.addContainer}>
            <div className={styles.formHeader}>
              <h2 className={styles.addTitle}>
                {isEditing ? (
                  <>
                    <TbEdit className={styles.titleIcon} />
                    تعديل خط
                  </>
                ) : (
                  <>
                    <TbPlus className={styles.titleIcon} />
                    إضافة خط جديد
                  </>
                )}
              </h2>
            </div>
            <form 
              className={styles.addForm}
              onSubmit={(e) => {
                e.preventDefault();
                handleAddPhone();
              }}
            >
              <div className={styles.formContent}>
                <div className={styles.formRow}>
                            <div className="inputContainer">
                    <label>
                      <TbUser className={styles.labelIcon} />
                      اسم المالك:
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="ادخل اسم المالك"
                      required
                      dir="rtl"
                    />
                            </div>
                            <div className="inputContainer">
                    <label>
                      <TbId className={styles.labelIcon} />
                      الرقم القومي:
                    </label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setNumber(val);
                      }}
                      placeholder="ادخل الرقم القومي"
                      dir="ltr"
                      inputMode="numeric"
                      style={{ textAlign: 'left', fontFamily: 'Courier New, monospace' }}
                    />
                            </div>
                        </div>
                <div className={styles.formRow}>
                            <div className="inputContainer">
                    <label>
                      <TbPhone className={styles.labelIcon} />
                      رقم الشريحة:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={phone === '' || phone === null || phone === undefined ? '' : phone.toString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setPhone(val === '' ? '' : val);
                      }}
                      placeholder="ادخل رقم الشريحة"
                      required
                      dir="ltr"
                      style={{ textAlign: 'left', fontFamily: 'Courier New, monospace' }}
                    />
                            </div>
                            <div className="inputContainer">
                    <label>
                      <TbWallet className={styles.labelIcon} />
                      الرصيد الحالي:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amount === '' || amount === null || amount === undefined ? '' : amount.toString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setAmount(val === '' ? '' : val);
                      }}
                      placeholder="ادخل الرصيد الحالي"
                      required
                      dir="ltr"
                      style={{ textAlign: 'left', fontFamily: 'Courier New, monospace' }}
                    />
                            </div>
                        </div>
                <div className={styles.formRow}>
                            <div className="inputContainer">
                    <label>
                      <TbTrendingDown className={styles.labelIcon} />
                      ليميت الاستلام:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={withdraw === '' || withdraw === null || withdraw === undefined ? '' : withdraw.toString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setWithdraw(val === '' ? '' : val);
                      }}
                      placeholder="ادخل ليميت الاستلام"
                      required
                      dir="ltr"
                      style={{ textAlign: 'left', fontFamily: 'Courier New, monospace' }}
                    />
                            </div>
                            <div className="inputContainer">
                    <label>
                      <TbTrendingUp className={styles.labelIcon} />
                      ليميت الارسال:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={deposit === '' || deposit === null || deposit === undefined ? '' : deposit.toString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setDeposit(val === '' ? '' : val);
                      }}
                      placeholder="ادخل ليميت الارسال"
                      required
                      dir="ltr"
                      style={{ textAlign: 'left', fontFamily: 'Courier New, monospace' }}
                    />
                  </div>
                </div>
                <div className={styles.formActions}>
                  <SafeButton 
                    type="submit"
                    loading={isAdding || isUpdating}
                    disabled={isAdding || isUpdating || isDeleting}
                  >
                    {isEditing ? 'تعديل الخط' : 'اضف الخط'}
                  </SafeButton>
                            </div>
                        </div>
            </form>
                    </div>
                )}


      <LineProfileModal
        isOpen={openProfile}
        onClose={() => setOpenProfile(false)}
        line={selectedLine}
        onEdit={() => {
          if (selectedLine) {
            handleEdit(selectedLine);
            setOpenProfile(false);
          }
        }}
        canEdit={canEdit}
      />

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="حذف الخط"
        message={`هل أنت متأكد من حذف خط ${deleteConfirm?.userName} (${deleteConfirm?.phone})؟`}
        type="danger"
      />
            </div>
    </>
  );
}

export default function Cards() {
  return (
    <MainLayout>
      <CardsPageContent />
    </MainLayout>
  );
}
