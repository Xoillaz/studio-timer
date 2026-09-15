'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import styles from '../venues/crud.module.css';

interface Order {
  id: number;
  orderNo: string;
  status: string;
  memberName: string;
  memberPhone: string;
  venueName: string;
  finalAmount: number;
  createdAt: string;
}

const statusMap: Record<string, string> = {
  pending_entry: '待入场',
  entering: '使用中',
  partial_exit_pending: '部分离场',
  pending_exit: '待审核',
  pending_bill: '待账单',
  completed: '已完成',
  cancelled: '已取消',
};

export default function OrdersPage() {
  const { token } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/v1/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = filter
    ? orders.filter(o => o.status === filter || o.orderNo.includes(filter))
    : orders;

  if (loading) return <div className={styles.loading}>加载中...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>订单管理</h1>
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <option value="">全部</option>
          <option value="pending_entry">待入场</option>
          <option value="entering">使用中</option>
          <option value="pending_exit">待审核</option>
          <option value="completed">已完成</option>
        </select>
      </div>
      <div className={styles.list}>
        {filteredOrders.map((order) => (
          <div key={order.id} className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.name}>{order.orderNo}</div>
              <div className={styles.info}>会员: {order.memberName} ({order.memberPhone})</div>
              <div className={styles.info}>场地: {order.venueName}</div>
              <div className={styles.info}>金额: ¥{order.finalAmount.toFixed(2)}</div>
              <div className={styles.info}>时间: {new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div className={styles.cardFooter}>
              <span style={{ padding: '2px 8px', borderRadius: '10px', background: order.status === 'completed' ? '#4caf50' : order.status === 'entering' ? '#2196f3' : '#ff9800', color: 'white', fontSize: 'var(--font-size-xs)' }}>
                {statusMap[order.status] || order.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
