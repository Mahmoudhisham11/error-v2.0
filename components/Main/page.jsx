'use client';
import { useEffect, useState } from "react";
import SideBar from "../SideBar/page";
import styles from "./styles.module.css";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/app/firebase";
import { FaRegTrashAlt } from "react-icons/fa";
import { useToast } from "@/components/ui/Toast/ToastProvider";

function Main() {
    const { showToast } = useToast();
    const [cards, setCards] = useState([]);
    const [operations, setOperations] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [shop, setShop] = useState('');
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [commation, setCommation] = useState('');
    const [deposit, setDeposit] = useState(0);
    const [withdraw, setWithdraw] = useState(0);
    const [cardAmount, setCardAmount] = useState(0);
    const [total, setTotal] = useState(0);
    const [name, setName] = useState('');
    const [type, setType] = useState('ارسال');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storageShop = localStorage.getItem('shop');
            setShop(storageShop);

            const q = query(collection(db, 'cards'), where('shop', '==', storageShop));
            const unsubscripe = onSnapshot(q, (querySnapshot) => {
                const cardsArrya = [];
                querySnapshot.forEach((doc) => {
                    cardsArrya.push({ ...doc.data(), id: doc.id });
                });
                setCards(cardsArrya);
            });

            const operationsQ = query(collection(db, 'operations'), where('shop', '==', storageShop));
            const unsubscripeOper = onSnapshot(operationsQ, (querySnapshot) => {
                const operationsArray = [];
                querySnapshot.forEach((doc) => {
                    operationsArray.push({ ...doc.data(), id: doc.id });
                });
                operationsArray.sort((a, b) => new Date(a.date) - new Date(b.date));
                setOperations(operationsArray);
            });

            return () => { unsubscripe(); unsubscripeOper(); };
        }
    }, []);

    useEffect(() => {
        const subTotal = operations.reduce((acc, operation) => {
            return acc + Number(operation.commation);
        }, 0);
        setTotal(subTotal);
    }, [operations]);

    const handlePhoneChande = async (e) => {
        const value = e.target.value;
        setPhone(value);
        const q = query(collection(db, 'cards'), where('shop', '==', shop), where('phone', '==', value));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const cardDoc = querySnapshot.docs[0];
            const cardData = cardDoc.data();
            setDeposit(cardData.depositLimit);
            setWithdraw(Number(cardData.withdrawLimit) - Number(cardData.amount));
            setCardAmount(cardData.amount);
        }
        if (!value) {
            setDeposit(0);
            setWithdraw(0);
            setCardAmount(0);
        }
    };


// الكود المعدل للدالة:
    const handleOperation = async () => {
        if (isProcessing) return; // لو العملية شغالة، تجاهل الضغط
        
        if (!phone || !amount || !commation) {
            showToast('برجاء ادخال كل البيانات قبل تنفيذ العملية', 'error');
            return;
        }

        const amountNum = Number(amount);
        const commationNum = Number(commation);

        if (isNaN(amountNum) || isNaN(commationNum) || amountNum <= 0 || commationNum < 0) {
            showToast("يجب أن يكون المبلغ رقمًا صحيحًا موجبًا والعمولة صفر أو أكثر", "error");
            return;
        }

        setIsProcessing(true); // نبدأ تنفيذ العملية

        try {
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
                    if (amountNum > currentAmount) {
                        showToast("الرصيد الحالي غير كافي لتنفيذ الإرسال", "error");
                        setIsProcessing(false);
                        return;
                    }
                    if (amountNum > currentDepositLimit) {
                        showToast("تم تجاوز حد الإرسال المسموح", "error");
                        setIsProcessing(false);
                        return;
                    }

                    currentAmount -= amountNum;
                    currentDepositLimit -= amountNum;

                } else if (type === 'استلام') {
                    if (amountNum > currentWithdrawLimit) {
                        showToast("تم تجاوز حد الاستلام المسموح", "error");
                        setIsProcessing(false);
                        return;
                    }

                    currentAmount += amountNum;
                    currentWithdrawLimit -= amountNum;
                }

                if (currentAmount < 0 || currentDepositLimit < 0 || currentWithdrawLimit < 0) {
                    showToast("لا يمكن تنفيذ العملية لأن ذلك يؤدي إلى قيم سالبة", "error");
                    setIsProcessing(false);
                    return;
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

                // تفريغ الحقول
                setPhone('');
                setAmount('');
                setCommation('');
                showToast("تم تنفيذ العملية بنجاح", "success");
            }
        } catch (error) {
            console.error("خطأ أثناء تنفيذ العملية:", error);
            showToast("حدث خطأ أثناء تنفيذ العملية", "error");
        } finally {
            setIsProcessing(false); // إعادة تفعيل الزر بعد انتهاء العملية
        }
    };



    const handleDeleteOperation = async (id) => {
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
                newDepositLimit += operationAmount
            } else if (operation.type === 'استلام') {
                if (newAmount - operationAmount < 0) {
                    showToast("لا يمكن حذف العملية لأن ذلك سيؤدي إلى رصيد سالب.", "error");
                    return;
                }
                newAmount -= operationAmount;
                newWithdrawLimit += operationAmount
            }

            await updateDoc(cardRef, {
                amount: newAmount,
                withdrawLimit: newWithdrawLimit,
                depositLimit: newDepositLimit
            });

            await deleteDoc(operationRef);
            showToast("تم حذف العملية وتعديل الرصيد بنجاح", "success");

        } catch (error) {
            console.error("حدث خطأ أثناء حذف العملية:", error);
            showToast("حدث خطأ أثناء حذف العملية", "error");
        }
    };

    const handleDeleteDay = async () => {
        const confirmDelete = window.confirm("هل تريد تقفيل اليوم");
        if (!confirmDelete) return;

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
        }
    };

    const netAmount = type === "ارسال"
        ? Number(amount) + Number(commation)
        : Number(amount) - Number(commation);

    return (
        <div className="main">
            <SideBar />
            <div className={styles.mainContainer}>
                <div className={styles.btnsContainer}>
                    <button onClick={handleOperation} disabled={isProcessing}>
                        {isProcessing
                            ? "جارٍ التنفيذ..."
                            : type === "ارسال"
                            ? "ارسال رصيد"
                            : "استلام رصيد"}
                    </button>
                    <button onClick={handleDeleteDay}>تقفيل اليوم</button>
                </div>
                <div className={styles.content}>
                    {/* Inputs */}
                    <div className="inputContainer">
                        <label>نوع العملية:</label>
                        <select value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="ارسال">ارسال</option>
                            <option value="استلام">استلام</option>
                        </select>
                    </div>
                    <div className="inputContainer">
                        <label>رقم الخط :</label>
                        <input list="numbers" type="number" value={phone} placeholder="احبث عن رقم الخط" onChange={handlePhoneChande} />
                        <datalist id="numbers">
                            {cards.map(card => (
                                <option key={card.id} value={card.phone} />
                            ))}
                        </datalist>
                    </div>
                    <div className="inputContainer">
                        <label>اسم العميل :</label>
                        <input type="text" value={name} placeholder="اسم العميل" onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className={styles.amoutContainer}>
                        <div className="inputContainer">
                            <label> المبلغ :</label>
                            <input type="number" value={amount} placeholder="اضف المبلغ" onChange={(e) => setAmount(e.target.value)} />
                        </div>
                        <div className="inputContainer">
                            <label>العمولة :</label>
                            <input type="number" value={commation} placeholder="اضف العمولة" onChange={(e) => setCommation(e.target.value)} />
                        </div>
                        <div className="inputContainer">
                            <label>صافي المبلغ :</label>
                            <input type="number" value={netAmount} readOnly disabled />
                        </div>
                    </div>
                    <div className={styles.amoutContainer}>
                        <div className="inputContainer">
                            <label> يمكن ارسال :</label>
                            <input type="number" value={deposit} disabled readOnly />
                        </div>
                        <div className="inputContainer">
                            <label>يمكن استلام :</label>
                            <input type="number" value={withdraw} disabled readOnly />
                        </div>
                        <div className="inputContainer">
                            <label> رصيد الخط :</label>
                            <input type="number" value={cardAmount} disabled readOnly />
                        </div>
                    </div>
                    <div className={styles.tableContainer}>
                        <table>
                            <thead>
                                <tr>
                                    <th>التسلسل</th>
                                    <th>الرقم المستخدم</th>
                                    <th>نوع العملية</th>
                                    <th>المبلغ</th>
                                    <th>العمولة</th>
                                    <th>صافي المبلغ</th>
                                    <th>رصيد الخط</th>
                                    <th>اسم العميل</th>
                                    <th>التفاعل</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operations.map((operation, index) => {
                                    const balance = operation.amountBefore !== undefined ?
                                        (operation.type === 'استلام'
                                            ? Number(operation.amountBefore) + Number(operation.amount)
                                            : Number(operation.amountBefore) - Number(operation.amount))
                                        : 0;

                                    return (
                                        <tr key={operation.id}>
                                            <td>{index + 1}</td>
                                            <td>{operation.phone}</td>
                                            <td>{operation.type}</td>
                                            <td>{operation.amount}</td>
                                            <td>{operation.commation}</td>
                                            <td>{operation.type === "ارسال"
                                                ? Number(operation.amount) + Number(operation.commation)
                                                : Number(operation.amount) - Number(operation.commation)}</td>
                                            <td>{balance}</td>
                                            <td>{operation.name}</td>
                                            <td className="actions">
                                                <button onClick={() => handleDeleteOperation(operation.id)}><FaRegTrashAlt /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={9}>صافي الربح اليومي : {total} جنية</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Main;
