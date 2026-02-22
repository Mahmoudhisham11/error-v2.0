'use client';
import { useEffect, useState, useMemo, useRef } from "react";
import MainLayout, { useSidebar } from "@/components/Layout/MainLayout/MainLayout";
import StatusBadge from "@/components/ui/StatusBadge/StatusBadge";
import ConfirmModal from "@/components/ui/ConfirmModal/ConfirmModal";
import MoneyInput from "@/components/ui/MoneyInput/MoneyInput";
import SafeButton from "@/components/ui/SafeButton/SafeButton";
import EmptyState from "@/components/ui/EmptyState/EmptyState";
import StatCard from "@/components/ui/StatCard/StatCard";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import { TbDeviceDesktop, TbSearch, TbPlus, TbEdit, TbTrash, TbWallet, TbTrendingUp, TbBuildingStore } from "react-icons/tb";
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
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import styles from "./styles.module.css";

function MachinesPageContent() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { showToast } = useToast();
  const headerRef = useRef(null);
  const [machines, setMachines] = useState([]);
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [shop, setShop] = useState("");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [balance, setBalance] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [machineId, setMachineId] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageShop = localStorage.getItem("shop");
      const storageUser = localStorage.getItem("userName");
      
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
          }
        });
      });

      // Check permissions
      if (storageUser) {
        const checkPermissions = async () => {
          const usersSnapshot = await getDocs(usersQ);
          usersSnapshot.forEach((doc) => {
            const user = doc.data();
            if (user.userName?.toLowerCase() === storageUser?.toLowerCase()) {
              if (!user.permissions?.machines) {
                showToast("ليس لديك صلاحية للوصول إلى هذه الصفحة", "error");
                window.location.href = '/';
                return;
              }
            }
          });
        };
        checkPermissions();
      }

      // Subscribe to machines
      let machinesQ;
      if (search !== '') {
        machinesQ = query(
          collection(db, 'machines'),
          where('shop', '==', storageShop),
          where('code', '==', search)
        );
      } else {
        machinesQ = query(
          collection(db, 'machines'),
          where('shop', '==', storageShop)
        );
      }

      const unsubscribeMachines = onSnapshot(machinesQ, (querySnapshot) => {
        const machinesArray = [];
        querySnapshot.forEach((doc) => {
          machinesArray.push({ ...doc.data(), id: doc.id });
        });
        setMachines(machinesArray);
      });

      // Subscribe to reports for machine profits
      const reportsQ = query(
        collection(db, 'reports'),
        where('shop', '==', storageShop)
      );

      const unsubscribeReports = onSnapshot(reportsQ, (querySnapshot) => {
        const reportsArray = [];
        querySnapshot.forEach((doc) => {
          reportsArray.push({ ...doc.data(), id: doc.id });
        });
        setReports(reportsArray);
      });

      return () => {
        unsubscribeMachines();
        unsubscribeReports();
        unsubscribeUsers();
      };
    }
  }, [search, showToast]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalBalances = machines.reduce((acc, m) => acc + Number(m.balance || 0), 0);
    const machineCount = machines.length;
    // Calculate total machine profits from reports
    const totalMachineProfit = reports
      .filter(r => r.type === 'عمولات المكينات')
      .reduce((acc, r) => acc + Number(r.commation || 0), 0);

    return {
      totalBalances,
      machineCount,
      totalMachineProfit
    };
  }, [machines, reports]);

  const handleAddMachine = async (e) => {
    if (e) {
      e.preventDefault();
    }

    // Validation
    if (!name || !name.trim()) {
      showToast("برجاء إدخال اسم الماكينة", "error");
      return;
    }

    if (!code || !code.trim()) {
      showToast("برجاء إدخال كود الماكينة", "error");
      return;
    }

    if (balance === '' || balance === null || balance === undefined || Number(balance) < 0) {
      showToast("برجاء إدخال رصيد صحيح", "error");
      return;
    }

    const balanceNum = Number(balance);
    if (isNaN(balanceNum)) {
      showToast("برجاء إدخال رقم صحيح", "error");
      return;
    }

    try {
      // Check for duplicate code
      if (!isEditing) {
        const codeCheckQuery = query(
          collection(db, 'machines'),
          where('shop', '==', shop),
          where('code', '==', code.trim())
        );
        const codeCheckSnapshot = await getDocs(codeCheckQuery);
        
        if (!codeCheckSnapshot.empty) {
          showToast("كود الماكينة موجود بالفعل", "error");
          return;
        }
      } else {
        // When editing, check if code changed and if new code exists
        const existingMachine = machines.find(m => m.id === machineId);
        if (existingMachine && existingMachine.code !== code.trim()) {
          const codeCheckQuery = query(
            collection(db, 'machines'),
            where('shop', '==', shop),
            where('code', '==', code.trim())
          );
          const codeCheckSnapshot = await getDocs(codeCheckQuery);
          
          if (!codeCheckSnapshot.empty) {
            showToast("كود الماكينة موجود بالفعل", "error");
            return;
          }
        }
      }

      if (isEditing && machineId) {
        setIsUpdating(true);
        await updateDoc(doc(db, "machines", machineId), {
          name: name.trim(),
          code: code.trim(),
          balance: balanceNum,
          isActive: isActive,
        });
        showToast("تم التعديل بنجاح", "success");
      } else {
        setIsAdding(true);
        await addDoc(collection(db, "machines"), {
          name: name.trim(),
          code: code.trim(),
          balance: balanceNum,
          shop,
          isActive: isActive,
          createdAt: new Date(),
        });
        showToast("تم إضافة الماكينة بنجاح", "success");
      }

      // Reset form
      setName("");
      setCode("");
      setBalance("");
      setIsActive(true);
      setMachineId("");
      setIsEditing(false);
      setShowForm(false);
    } catch (error) {
      console.error("Error saving machine:", error);
      showToast(isEditing ? "حدث خطأ أثناء تعديل الماكينة" : "حدث خطأ أثناء إضافة الماكينة", "error");
    } finally {
      setIsAdding(false);
      setIsUpdating(false);
    }
  };

  const handleDelete = (machine) => {
    setDeleteConfirm(machine);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        setIsDeleting(true);
        await deleteDoc(doc(db, "machines", deleteConfirm.id));
        showToast("تم حذف الماكينة بنجاح", "success");
        setDeleteConfirm(null);
      } catch (error) {
        console.error("Error deleting machine:", error);
        showToast("حدث خطأ أثناء حذف الماكينة", "error");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEdit = (machine) => {
    setMachineId(machine.id);
    setName(machine.name || "");
    setCode(machine.code || "");
    setBalance(machine.balance?.toString() || "");
    setIsActive(machine.isActive !== false);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleToggleView = () => {
    if (showForm) {
      // Reset form when going back to table view
      setName("");
      setCode("");
      setBalance("");
      setIsActive(true);
      setMachineId("");
      setIsEditing(false);
    }
    setShowForm(!showForm);
  };

  const filteredMachines = useMemo(() => {
    if (!search) return machines;
    return machines.filter(m => 
      m.code?.includes(search) || 
      m.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [machines, search]);

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
            <h1 className={styles.pageTitle}>إدارة المكينات</h1>
          </div>
          <div className={styles.headerActions}>
            <button 
              onClick={handleToggleView}
              className={styles.addButton}
              disabled={isAdding || isUpdating || isDeleting}
            >
              {showForm ? 'كل المكينات' : '+ إضافة ماكينة جديدة'}
            </button>
          </div>
        </div>

        {!showForm && (
          <div className={styles.statsGrid}>
            <StatCard
              title="إجمالي رصيد المكينات"
              value={`${stats.totalBalances.toLocaleString('en-US')} جنيه`}
              icon={<TbWallet />}
              color="primary"
            />
            <StatCard
              title="عدد المكينات"
              value={stats.machineCount}
              icon={<TbDeviceDesktop />}
              color="info"
            />
            <StatCard
              title="أرباح المكينات"
              value={`${stats.totalMachineProfit.toLocaleString('en-US')} جنيه`}
              icon={<TbTrendingUp />}
              color="success"
            />
          </div>
        )}

        {!showForm && (
          <div className={styles.toolbar}>
            <div className={styles.searchContainer}>
              <TbSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="ابحث عن الماكينة (اسم أو كود)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
        )}

        {!showForm && (
          <div className={styles.tableContainer}>
            {filteredMachines.length === 0 ? (
              <EmptyState
                icon={<TbDeviceDesktop />}
                title="لا توجد مكينات"
                message="لم يتم إضافة أي مكينات بعد"
              />
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>التسلسل</th>
                      <th>اسم الماكينة</th>
                      <th>كود الماكينة</th>
                      <th>الرصيد</th>
                      <th>الحالة</th>
                      <th>التفاعل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMachines.map((machine, index) => (
                      <tr key={machine.id} className={styles.tableRow}>
                        <td>{index + 1}</td>
                        <td>{machine.name}</td>
                        <td className={styles.codeCell}>{machine.code}</td>
                        <td className={styles.moneyCell}>
                          {Number(machine.balance || 0).toLocaleString('en-US')} جنيه
                        </td>
                        <td>
                          <StatusBadge status={machine.isActive !== false ? 'safe' : 'blocked'}>
                            {machine.isActive !== false ? 'نشط' : 'معطل'}
                          </StatusBadge>
                        </td>
                        <td className="actions" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => handleEdit(machine)} 
                            className={styles.editBtn} 
                            disabled={isDeleting || isUpdating}
                          >
                            {isUpdating && machineId === machine.id ? (
                              <span className={styles.spinner}></span>
                            ) : (
                              <TbEdit />
                            )}
                          </button>
                          <button 
                            onClick={() => handleDelete(machine)} 
                            className={styles.deleteBtn} 
                            disabled={isDeleting || isUpdating}
                          >
                            {isDeleting && deleteConfirm?.id === machine.id ? (
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
          </div>
        )}

        {showForm && (
          <div className={styles.addContainer}>
            <div className={styles.formHeader}>
              <h2 className={styles.addTitle}>
                {isEditing ? (
                  <>
                    <TbEdit className={styles.titleIcon} />
                    تعديل ماكينة
                  </>
                ) : (
                  <>
                    <TbPlus className={styles.titleIcon} />
                    إضافة ماكينة جديدة
                  </>
                )}
              </h2>
            </div>
            <form 
              className={styles.addForm}
              onSubmit={(e) => {
                e.preventDefault();
                handleAddMachine();
              }}
            >
              <div className={styles.formContent}>
                <div className={styles.formRow}>
                  <div className="inputContainer">
                    <label>
                      <TbDeviceDesktop className={styles.labelIcon} />
                      اسم الماكينة:
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ادخل اسم الماكينة"
                      required
                      dir="rtl"
                    />
                  </div>
                  <div className="inputContainer">
                    <label>
                      <TbBuildingStore className={styles.labelIcon} />
                      كود الماكينة:
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.trim())}
                      placeholder="ادخل كود الماكينة"
                      required
                      dir="ltr"
                      style={{ textAlign: 'left', fontFamily: 'Courier New, monospace' }}
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className="inputContainer">
                    <MoneyInput
                      label="الرصيد الحالي"
                      value={balance}
                      onChange={setBalance}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className={styles.toggleContainer}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        className={styles.toggleInput}
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                      <span className={styles.toggleSlider}></span>
                      <span className={styles.toggleText}>ماكينة نشطة</span>
                    </label>
                  </div>
                </div>
                <div className={styles.formActions}>
                  <SafeButton 
                    type="submit"
                    loading={isAdding || isUpdating}
                    disabled={isAdding || isUpdating || isDeleting}
                  >
                    {isEditing ? 'تعديل الماكينة' : 'إضافة الماكينة'}
                  </SafeButton>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="حذف الماكينة"
        message={`هل أنت متأكد من حذف الماكينة ${deleteConfirm?.name} (${deleteConfirm?.code})؟`}
        type="danger"
        loading={isDeleting}
        disabled={isDeleting}
      />
    </>
  );
}

export default function Machines() {
  return (
    <MainLayout>
      <MachinesPageContent />
    </MainLayout>
  );
}

