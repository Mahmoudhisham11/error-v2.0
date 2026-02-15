'use client';
import { useEffect, useState, useMemo, useRef } from "react";
import MainLayout, { useSidebar } from "@/components/Layout/MainLayout/MainLayout";
import StatCard from "@/components/ui/StatCard/StatCard";
import EmptyState from "@/components/ui/EmptyState/EmptyState";
import SafeButton from "@/components/ui/SafeButton/SafeButton";
import { TbMoneybag, TbTrendingUp, TbTrendingDown, TbFileExport } from "react-icons/tb";
import { HiMenu, HiX } from "react-icons/hi";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import styles from "./styles.module.css";

function ReportsPageContent() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const headerRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA");
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageShop = localStorage.getItem("shop");

      const fetchReportsByDate = async () => {
        if (!selectedDate || !storageShop) return;

        const q = query(
          collection(db, "reports"),
          where("date", "==", selectedDate),
          where("shop", "==", storageShop)
        );

        const querySnapshot = await getDocs(q);
        const reportsArray = [];

        querySnapshot.forEach((doc) => {
          reportsArray.push({ ...doc.data(), id: doc.id });
        });

        setReports(reportsArray);
      };

      fetchReportsByDate();
    }
  }, [selectedDate]);

  const stats = useMemo(() => {
    const profit = reports.reduce((acc, report) => acc + Number(report.commation || 0), 0);
    const sendOps = reports.filter(r => r.type === 'ارسال');
    const receiveOps = reports.filter(r => r.type === 'استلام');
    const sendTotal = sendOps.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const receiveTotal = receiveOps.reduce((acc, r) => acc + Number(r.amount || 0), 0);

    return { profit, sendTotal, receiveTotal, sendCount: sendOps.length, receiveCount: receiveOps.length };
  }, [reports]);

  useEffect(() => {
    setTotal(stats.profit);
  }, [stats]);

  return (
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
            <h1 className={styles.pageTitle}>التقارير</h1>
          </div>
          <div className={styles.headerActions}>
            <SafeButton onClick={() => window.print()} variant="secondary">
              <TbFileExport /> تصدير PDF
            </SafeButton>
          </div>
        </div>

      <div className={styles.controls}>
        <div className={styles.dateContainer}>
          <label className={styles.dateLabel}>تاريخ التقرير:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          title="صافي الربح"
          value={`${stats.profit.toLocaleString('en-US')} جنيه`}
          icon={<TbMoneybag />}
          color="success"
        />
        <StatCard
          title="عمليات الإرسال"
          value={stats.sendCount}
          icon={<TbTrendingUp />}
          color="danger"
        />
        <StatCard
          title="عمليات الاستلام"
          value={stats.receiveCount}
          icon={<TbTrendingDown />}
          color="info"
        />
      </div>

        <div className={styles.tableContainer}>
          {reports.length === 0 ? (
            <EmptyState
              icon={<TbMoneybag />}
              title="لا توجد تقارير"
              message={`لا توجد تقارير في تاريخ ${selectedDate}`}
            />
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>الرقم المستخدم</th>
                    <th>نوع العملية</th>
                    <th>المبلغ</th>
                    <th>العمولة</th>
                    <th>اجمالي المبلغ</th>
                    <th>اسم العميل</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const netAmount = report.type === "ارسال"
                      ? Number(report.amount || 0) + Number(report.commation || 0)
                      : Number(report.amount || 0) - Number(report.commation || 0);
                    const isSend = report.type === 'ارسال';

                    return (
                      <tr key={report.id} className={isSend ? styles.sendRow : styles.receiveRow}>
                        <td className={styles.phoneCell}>{report.phone}</td>
                        <td>
                          <span className={`${styles.typeBadge} ${isSend ? styles.sendBadge : styles.receiveBadge}`}>
                            {report.type}
                          </span>
                        </td>
                        <td className={styles.moneyCell}>
                          {Number(report.amount || 0).toLocaleString('en-US')}
                        </td>
                        <td className={styles.moneyCell}>
                          {Number(report.commation || 0).toLocaleString('en-US')}
                        </td>
                        <td className={styles.moneyCell}>{netAmount.toLocaleString('en-US')}</td>
                        <td>{report.name || '-'}</td>
                        <td>{report.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}

export default function Reports() {
  return (
    <MainLayout>
      <ReportsPageContent />
    </MainLayout>
  );
}
