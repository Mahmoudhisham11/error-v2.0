  'use client';
  import styles from "./styles.module.css";
  import Link from "next/link";
  import { TbMoneybag, TbReportSearch, TbLayoutDashboard, TbReceipt } from "react-icons/tb";
  import { BiMemoryCard } from "react-icons/bi";
  import { RiLogoutCircleLine, RiSettings4Line, RiQuestionAnswerLine } from "react-icons/ri";
  import { HiOutlineChevronLeft, HiX } from "react-icons/hi";
  import { usePathname } from "next/navigation";
  import { useEffect, useState } from "react";
  import { collection, onSnapshot, query } from "firebase/firestore";
  import { db } from "@/app/firebase";
  import ConfirmModal from "@/components/ui/ConfirmModal/ConfirmModal";

  function SideBar({ isOpen, onClose }) {
    const [users, setUsers] = useState([]);
    const [permissions, setPermissions] = useState({});
    const [userName, setUserName] = useState('');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [pendingLogoutConfirm, setPendingLogoutConfirm] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
      // Close sidebar when navigating on mobile
      if (isOpen && window.innerWidth < 1024 && onClose && pathname) {
        // Small delay to allow navigation to complete
        const timer = setTimeout(() => {
          onClose();
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [pathname]);

    useEffect(() => {
      const storageUser = localStorage.getItem("userName");
      if (storageUser) {
        setUserName(storageUser);
        console.log("👤 userName from storage:", storageUser);
      }

      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userArray = [];
        querySnapshot.forEach((doc) => {
          userArray.push({ ...doc.data(), id: doc.id });
        });
        setUsers(userArray);
      });

      return () => unsubscribe();
    }, []);

    useEffect(() => {
      if (users.length > 0 && userName) {
        const currentUser = users.find(
          user => user.userName?.toLowerCase() === userName.toLowerCase()
        );
        if (currentUser && currentUser.permissions) {
          console.log("✅ currentUser:", currentUser);
          setPermissions(currentUser.permissions);
        }
      }
    }, [users, userName]);

    // useEffect لمراقبة إغلاق SideBar وإظهار modal بعد الإغلاق
    useEffect(() => {
      if (!isOpen && pendingLogoutConfirm) {
        // بعد إغلاق SideBar، إظهار modal
        setShowLogoutConfirm(true);
        setPendingLogoutConfirm(false);
      }
    }, [isOpen, pendingLogoutConfirm]);

    const mainLinks = [
      {
        key: 'home',
        href: '/operations',
        label: 'المبيعات اليومية',
        icon: <TbMoneybag />,
        alwaysVisible: true
      },
      {
        key: 'cards',
        href: '/cards',
        label: 'الخطوط',
        icon: <BiMemoryCard />,
        alwaysVisible: false
      },
      {
        key: 'reports',
        href: '/reports',
        label: 'التقارير',
        icon: <TbReportSearch />,
        alwaysVisible: false
      }
    ];

    const otherLinks = [
      {
        key: 'dashboard',
        href: '/dashboard',
        label: 'لوحة التحكم',
        icon: <TbLayoutDashboard />,
        alwaysVisible: false
      },
      {
        key: 'expenses',
        href: '/expenses',
        label: 'المصاريف',
        icon: <TbReceipt />,
        alwaysVisible: false
      },
      {
        key: 'sittings',
        href: '/sittings',
        label: 'الإعدادات',
        icon: <RiSettings4Line />,
        alwaysVisible: false
      }
    ];

    const handleLogout = () => {
      // إغلاق SideBar في الموبايل أولاً
      if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
        setPendingLogoutConfirm(true);
        onClose();
      } else {
        // في الديسكتوب، إظهار popup مباشرة
        setShowLogoutConfirm(true);
      }
    };

    const confirmLogout = () => {
      if(typeof window !== 'undefined') {
        if (window.innerWidth < 1024 && onClose) {
          onClose();
        }
        localStorage.clear()
        window.location.reload()
      }
    };

    return (
      <>
        <div className={`${styles.sideBarContainer} ${isOpen ? styles.mobileOpen : ''}`}>
          <div className={styles.header}>
            <h1 className={styles.logo}>ERROR</h1>
            <button 
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <HiX />
            </button>
        </div>
          <div className={styles.navigation}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>القائمة</h3>
              <div className={styles.links}>
                {mainLinks.map(link => (
            (link.alwaysVisible || permissions[link.key]) && (
                    <Link 
                      href={link.href} 
                      key={link.key} 
                      className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
                      onClick={() => {
                        if (window.innerWidth < 1024 && onClose) {
                          onClose();
                        }
                      }}
                    >
                      <span className={styles.icon}>{link.icon}</span>
                      <span className={styles.label}>{link.label}</span>
              </Link>
            )
          ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>أخرى</h3>
              <div className={styles.links}>
                {otherLinks.map(link => (
                  (link.alwaysVisible || permissions[link.key]) && (
                    link.onClick ? (
                      <button
                        key={link.key}
                        onClick={link.onClick}
                        className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
                      >
                        <span className={styles.icon}>{link.icon}</span>
                        <span className={styles.label}>{link.label}</span>
                      </button>
                    ) : (
                      <Link 
                        href={link.href} 
                        key={link.key} 
                        className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
                        onClick={() => {
                          if (window.innerWidth < 1024 && onClose) {
                            onClose();
                          }
                        }}
                      >
                        <span className={styles.icon}>{link.icon}</span>
                        <span className={styles.label}>{link.label}</span>
                      </Link>
                    )
                  )
                ))}
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <div className={styles.userProfile}>
              <div className={styles.avatar}>
                <span className={styles.avatarText}>
                  {userName ? userName.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{userName || 'المستخدم'}</div>
                <div className={styles.accountType}>حساب شخصي</div>
              </div>
              <HiOutlineChevronLeft className={styles.chevronIcon} />
            </div>

          <button onClick={handleLogout} className={styles.logoutBtn}>
              <span className={styles.icon}><RiLogoutCircleLine/></span>
              <span className={styles.label}>تسجيل الخروج</span>
          </button>
        </div>
      </div>

        <ConfirmModal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={confirmLogout}
          title="تسجيل الخروج"
          message="هل أنت متأكد من تسجيل الخروج؟"
          type="danger"
        />
      </>
    );
  }

  export default SideBar;
