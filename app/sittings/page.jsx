'use client';
import { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout/MainLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge/StatusBadge";
import ConfirmModal from "@/components/ui/ConfirmModal/ConfirmModal";
import SafeButton from "@/components/ui/SafeButton/SafeButton";
import DangerButton from "@/components/ui/DangerButton/DangerButton";
import EmptyState from "@/components/ui/EmptyState/EmptyState";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import { collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaTrashAlt } from "react-icons/fa";
import { TbUsers, TbShield } from "react-icons/tb";
import styles from "./styles.module.css";

export default function Sittings() {
  const { showToast } = useToast();
  const btns = ['المستخدمين', 'الصلاحيات'];
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState({
    cards: false,
    reports: false,
    sittings: false,
    dashboard: false,
    expenses: false,
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [active, setActive] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [disableWarning, setDisableWarning] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setUsers(allUsers);
    });

    return () => unsubscribe();
  }, []);

  const handleSelectUser = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setPermissions(user.permissions || {
        cards: false,
        reports: false,
        sittings: false,
        dashboard: false,
        expenses: false,
      });
      setActive(user.permissions?.active ?? true);
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    // Check if trying to disable active user
    if (!active && selectedUser.permissions?.active === true) {
      setDisableWarning(true);
      return;
    }

    const userRef = doc(db, 'users', selectedUser.id);
    await updateDoc(userRef, {
      permissions: {
        ...permissions,
        active,
      },
    });
    showToast('تم تحديث صلاحيات المستخدم بنجاح', 'success');
  };

  const confirmDisable = async () => {
    if (!selectedUser) return;
    const userRef = doc(db, 'users', selectedUser.id);
    await updateDoc(userRef, {
      permissions: {
        ...permissions,
        active: false,
      },
    });
    setActive(false);
    setDisableWarning(false);
    showToast('تم تعطيل المستخدم بنجاح', 'success');
  };

  const handleDelete = (user) => {
    setDeleteConfirm(user);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteDoc(doc(db, 'users', deleteConfirm.id));
      showToast('تم حذف المستخدم بنجاح', 'success');
      setDeleteConfirm(null);
      if (selectedUser?.id === deleteConfirm.id) {
        setSelectedUser(null);
      }
    }
  };

  const togglePermission = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <MainLayout>
      <PageHeader
        title="الإعدادات"
        subtitle="إدارة المستخدمين والصلاحيات"
      />

      <div className={styles.tabs}>
        {btns.map((btn, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`${styles.tab} ${activeTab === index ? styles.active : ''}`}
          >
            {index === 0 ? <TbUsers /> : <TbShield />}
            {btn}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className={styles.usersContainer}>
          {users.length === 0 ? (
            <EmptyState
              icon={<TbUsers />}
              title="لا يوجد مستخدمين"
              message="لم يتم إضافة أي مستخدمين بعد"
            />
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>اسم المستخدم</th>
                  <th>اسم الفرع</th>
                  <th>الحالة</th>
                  <th>التفاعل</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td className={styles.userName}>{user.userName}</td>
                    <td>{user.shop}</td>
                    <td>
                      <StatusBadge status={user.permissions?.active ? 'safe' : 'blocked'}>
                        {user.permissions?.active ? 'نشط' : 'معطل'}
                      </StatusBadge>
                    </td>
                    <td className="actions">
                      <button
                        onClick={() => handleDelete(user)}
                        className={styles.deleteButton}
                        title="حذف المستخدم"
                      >
                        <FaTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 1 && (
        <div className={styles.permissionsContainer}>
          <div className={styles.userSelector}>
            <label className={styles.label}>اختر المستخدم:</label>
            <select
              onChange={(e) => handleSelectUser(e.target.value)}
              value={selectedUser?.id || ''}
              className={styles.select}
            >
              <option value="">-- اختر مستخدم --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.userName}</option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div className={styles.permissionsCard}>
              <h3 className={styles.permissionsTitle}>
                صلاحيات المستخدم: {selectedUser.userName}
              </h3>

              <div className={styles.toggleGroup}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <span className={styles.toggleSlider}></span>
                  <span className={styles.toggleText}>تفعيل الحساب</span>
                </label>
              </div>

              <div className={styles.permissionsList}>
                <h4 className={styles.sectionTitle}>الصلاحيات:</h4>
                <div className={styles.permissionItem}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={permissions.dashboard || false}
                      onChange={() => togglePermission('dashboard')}
                    />
                    <span className={styles.toggleSlider}></span>
                    <span className={styles.toggleText}>لوحة التحكم</span>
                  </label>
                </div>
                <div className={styles.permissionItem}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={permissions.cards || false}
                      onChange={() => togglePermission('cards')}
                    />
                    <span className={styles.toggleSlider}></span>
                    <span className={styles.toggleText}>صفحة الخطوط</span>
                  </label>
                </div>
                <div className={styles.permissionItem}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={permissions.reports || false}
                      onChange={() => togglePermission('reports')}
                    />
                    <span className={styles.toggleSlider}></span>
                    <span className={styles.toggleText}>صفحة التقارير</span>
                  </label>
                </div>
                <div className={styles.permissionItem}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={permissions.sittings || false}
                      onChange={() => togglePermission('sittings')}
                    />
                    <span className={styles.toggleSlider}></span>
                    <span className={styles.toggleText}>صفحة الإعدادات</span>
                  </label>
                </div>
                <div className={styles.permissionItem}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={permissions.expenses || false}
                      onChange={() => togglePermission('expenses')}
                    />
                    <span className={styles.toggleSlider}></span>
                    <span className={styles.toggleText}>صفحة المصاريف</span>
                  </label>
                </div>
              </div>

              <div className={styles.saveSection}>
                <SafeButton onClick={handleSave}>حفظ التعديلات</SafeButton>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="حذف المستخدم"
        message={`هل أنت متأكد من حذف المستخدم ${deleteConfirm?.userName}؟`}
        type="danger"
      />

      <ConfirmModal
        isOpen={disableWarning}
        onClose={() => setDisableWarning(false)}
        onConfirm={confirmDisable}
        title="تحذير: تعطيل مستخدم نشط"
        message={`أنت على وشك تعطيل المستخدم ${selectedUser?.userName}. سيتم تسجيل خروجه تلقائياً. هل أنت متأكد؟`}
        type="warning"
      />
    </MainLayout>
  );
}
