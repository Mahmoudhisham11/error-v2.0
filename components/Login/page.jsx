'use client';
import styles from "./styles.module.css";
import { useState, useEffect } from "react";
import { db } from "@/app/firebase";
import { addDoc, collection, doc, getDocs, query, where } from "firebase/firestore";
import { TbEye, TbEyeOff, TbUser, TbLock, TbBuilding } from "react-icons/tb";
import { useToast } from "@/components/ui/Toast/ToastProvider";

function Login() {
    const { showToast } = useToast();
    const [active, setActive] = useState(false)
    const [userName, setUserName] = useState('')
    const [password, setPassword] =  useState('')
    const [shop, setShop] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // CREATE ACCOUNT FUNCTION 
    const handleCreatAcc = async() => {
        if(!userName) {
            showToast("يجب ادخال اسم المستخدم", "error")
            return
        }
        if(!password) {
            showToast("يجب ادخال كلمة المرور", "error")
            return
        }
        if(!shop) {
            showToast("يجب ادخال اسم المحل", "error")
            return
        }
        const q = query(collection(db, 'users'), where('userName', '==', userName.toLowerCase().trim()))
        const querySnapshot = await getDocs(q)
        if(querySnapshot.empty) {
            await addDoc(collection(db, 'users'), {
                userName: userName.toLowerCase().trim(),
                 password, 
                 shop,
                 permissions: {cards: false, reports: false, active: false, sittings: false, dashboard: false, expenses: false}
                })
            showToast("تم انشاء حساب للمستخدم", "success")
            setUserName('')
            setPassword('')
            setShop('')
        }else {
            showToast('المستخدم موجود بالفعل', "error")
        }
    }
    useEffect(() => {
    const checkUserActiveStatus = async () => {
        const savedUserName = localStorage.getItem("userName");
        const savedShop = localStorage.getItem("shop");

        if (!savedUserName || !savedShop) return;

        try {
            const q = query(
                collection(db, "users"),
                where("userName", "==", savedUserName.toLowerCase().trim())
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();

                // تحقق من shop
                if (userData.shop.toLowerCase().trim() !== savedShop.toLowerCase().trim()) {
                    localStorage.clear();
                    window.location.reload();
                    return;
                }

                // تحقق من active
                if (userData.permissions?.active !== true) {
                    showToast("التطبيق يحتاج الى الصيانة الدورية", "warning");
                    localStorage.clear();
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error("Error checking user active status:", error);
        }
    };

    checkUserActiveStatus();
}, []);


    // HANDLE LOGIN FUNCTION
    const handleLogin = async () => {
        if (!userName) {
            showToast("يجب ادخال اسم المستخدم", "error");
            return;
        }
        if (!password) {
            showToast("يجب ادخال كلمة المرور", "error");
            return;
        }
        if (!shop) {
            showToast("يجب ادخال اسم المحل", "error");
            return;
        }

        try {
            // التأكد من وجود المستخدم
            const q = query(
            collection(db, "users"),
            where("userName", "==", userName.toLowerCase().trim())
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
            showToast("اسم المستخدم غير صحيح", "error");
            return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // التأكد من كلمة المرور
            if (userData.password !== password) {
            showToast("كلمة المرور غير صحيحة", "error");
            return;
            }

            // التأكد من وجود shop مطابق
            if (userData.shop.toLowerCase().trim() !== shop.toLowerCase().trim()) {
            showToast("اسم المحل غير صحيح أو لا يطابق اسم المحل المرتبط بالحساب", "error");
            return;
            }

            // التحقق من حالة التفعيل
            if (userData.permissions?.active !== true) {
            showToast("تم تعطيل الحساب، برجاء التواصل مع المطور", "error");
            localStorage.clear(); // تسجيل خروج
            if (typeof window !== "undefined") {
                window.location.reload();
            }
            return;
            }

            // حفظ البيانات في localStorage
            if (typeof window !== "undefined") {
            localStorage.setItem("userName", userName);
            localStorage.setItem("shop", shop);
            window.location.reload();
            }
        } catch (error) {
            console.error("Login error:", error);
            showToast("حدث خطأ أثناء تسجيل الدخول", "error");
        }
    };


    return(
        <div className={styles.loginContainer}>
            <header className={styles.header}>
                <h1 className={styles.logo}>ERROR</h1>
            </header>

            <div className={styles.formWrapper}>
                <div className={styles.formCard}>
                    {!active ? (
                        <>
                            <div className={styles.formHeader}>
                                <h2 className={styles.formTitle}>تسجيل الدخول</h2>
                                <p className={styles.formSubtitle}>مرحبا بعودتك 👋</p>
                            </div>

                            <div className={styles.formContent}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>
                                        <TbUser className={styles.labelIcon} />
                                        اسم المستخدم
                                    </label>
                                    <input 
                                        type="text" 
                                        className={styles.input}
                                        value={userName} 
                                        onChange={(e) => setUserName(e.target.value)} 
                                        placeholder="أدخل اسم المستخدم"
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>
                                        <TbLock className={styles.labelIcon} />
                                        كلمة المرور
                                    </label>
                                    <div className={styles.passwordWrapper}>
                                        <input 
                                            type={showPassword ? 'text' : 'password'} 
                                            className={styles.input}
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)} 
                                            placeholder="أدخل كلمة المرور"
                                        />
                                        <button 
                                            type="button"
                                            className={styles.passwordToggle}
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                        >
                                            {showPassword ? <TbEyeOff /> : <TbEye />}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>
                                        <TbBuilding className={styles.labelIcon} />
                                        اسم الفرع
                                    </label>
                                    <input 
                                        type="text" 
                                        className={styles.input}
                                        value={shop} 
                                        onChange={(e) => setShop(e.target.value)} 
                                        placeholder="أدخل اسم الفرع"
                                    />
                                </div>

                                <button className={styles.submitButton} onClick={handleLogin}>
                                    تسجيل الدخول
                                </button>

                                <div className={styles.toggleLink}>
                                    <span>ليس لديك حساب؟</span>
                                    <button onClick={() => setActive(true)} className={styles.linkButton}>
                                        إنشاء حساب جديد
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.formHeader}>
                                <h2 className={styles.formTitle}>إنشاء حساب</h2>
                                <p className={styles.formSubtitle}>أهلا بك 👋</p>
                            </div>

                            <div className={styles.formContent}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>
                                        <TbUser className={styles.labelIcon} />
                                        اسم المستخدم
                                    </label>
                                    <input 
                                        type="text" 
                                        className={styles.input}
                                        value={userName} 
                                        onChange={(e) => setUserName(e.target.value)} 
                                        placeholder="أدخل اسم المستخدم"
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>
                                        <TbLock className={styles.labelIcon} />
                                        كلمة المرور
                                    </label>
                                    <div className={styles.passwordWrapper}>
                                        <input 
                                            type={showPassword ? 'text' : 'password'} 
                                            className={styles.input}
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)} 
                                            placeholder="أدخل كلمة المرور"
                                        />
                                        <button 
                                            type="button"
                                            className={styles.passwordToggle}
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                        >
                                            {showPassword ? <TbEyeOff /> : <TbEye />}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>
                                        <TbBuilding className={styles.labelIcon} />
                                        اسم الفرع
                                    </label>
                                    <input 
                                        type="text" 
                                        className={styles.input}
                                        value={shop} 
                                        onChange={(e) => setShop(e.target.value)} 
                                        placeholder="أدخل اسم الفرع"
                                    />
                                </div>

                                <button className={styles.submitButton} onClick={handleCreatAcc}>
                                    إنشاء حساب
                                </button>

                                <div className={styles.toggleLink}>
                                    <span>لديك حساب بالفعل؟</span>
                                    <button onClick={() => setActive(false)} className={styles.linkButton}>
                                        تسجيل الدخول
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Login;