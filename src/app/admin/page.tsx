'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import styles from './admin.module.css';

interface DashboardData {
  pendingCount: number;
  todayOrders: number;
  todayRevenue: number;
  activeMembers: number;
}

export default function AdminDashboard() {
  const { token } = useAdminAuth();
  const [data, setData] = useState<DashboardData>({
    pendingCount: 0,
    todayOrders: 0,
    todayRevenue: 0,
    activeMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/v1/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.code === 0) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>加载中...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>仪表盘</h1>
      
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.pendingCount}</div>
          <div className={styles.statLabel}>待审核</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.todayOrders}</div>
          <div className={styles.statLabel}>今日订单</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>¥{data.todayRevenue.toFixed(2)}</div>
          <div className={styles.statLabel}>今日收入</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.activeMembers}</div>
          <div className={styles.statLabel}>活跃会员</div>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>快捷操作</h2>
        <div className={styles.actions}>
          <a href="/admin/pending" className={styles.actionBtn}>
            待审核列表
            {data.pendingCount > 0 && <span className={styles.badge}>{data.pendingCount}</span>}
          </a>
          <a href="/admin/venues" className={styles.actionBtn}>场地管理</a>
          <a href="/admin/orders" className={styles.actionBtn}>订单管理</a>
        </div>
      </div>
    </div>
  );
}
