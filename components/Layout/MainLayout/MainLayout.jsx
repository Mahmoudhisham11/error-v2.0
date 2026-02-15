'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import SideBar from '../../SideBar/page';
import styles from './MainLayout.module.css';

const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within MainLayout');
  }
  return context;
};

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar, closeSidebar }}>
      <div className={styles.mainLayout}>
        {sidebarOpen && (
          <div 
            className={styles.overlay}
            onClick={closeSidebar}
          />
        )}

        <div 
          className={`${styles.sidebarWrapper} ${sidebarOpen ? styles.sidebarOpen : ''}`}
        >
          <SideBar 
            isOpen={sidebarOpen}
            onClose={closeSidebar}
          />
        </div>

        <main className={styles.content}>{children}</main>
      </div>
    </SidebarContext.Provider>
  );
}

