'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import styles from './admin-layout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, token, logout, isLoading } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) {
      window.location.href = '/admin/login';
    }
  }, [isLoading, token]);

  if (isLoading) {
    return <div className={styles.loading}>加载中...</div>;
  }

  if (!token) {
    return null;
  }

  const handleLogout = () => {
    logout();
    window.location.href = '/admin/login';
  };

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles.logo}>片场管理</div>
        <nav className={styles.nav}>
          <Link href="/admin" className={styles.navItem}>仪表盘</Link>
          <Link href="/admin/pending" className={styles.navItem}>待审核</Link>
          <Link href="/admin/venues" className={styles.navItem}>场地管理</Link>
          <Link href="/admin/equipments" className={styles.navItem}>设备管理</Link>
          <Link href="/admin/members" className={styles.navItem}>会员管理</Link>
          <Link href="/admin/orders" className={styles.navItem}>订单管理</Link>
          <Link href="/admin/logs" className={styles.navItem}>操作日志</Link>
        </nav>
        <div className={styles.user}>
          <span>{admin?.realName}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>退出</button>
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.header}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={styles.menuBtn}>
            ☰
          </button>
        </header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
