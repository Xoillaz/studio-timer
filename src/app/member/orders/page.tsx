'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import styles from './orders.module.css';

interface Order {
  id: number;
  orderNo: string;
  status: string;
  venueName: string;
  entryTime: string;
  exitTime: string | null;
  durationMinutes: number;
  baseAmount: number;
  finalAmount: number;
}

const STATUS_MAP: Record<string, { label: string; variant: 'entering' | 'pending' | 'completed' | 'rejected' | 'default' }> = {
  pending_entry: { label: '待入场', variant: 'pending' },
  entering: { label: '进行中', variant: 'entering' },
  partial_exit_pending: { label: '部分离场待审核', variant: 'pending' },
  pending_exit: { label: '离场待审核', variant: 'pending' },
  reviewing: { label: '审核中', variant: 'pending' },
  topup_pending: { label: '补差价待审核', variant: 'pending' },
  pending_settlement: { label: '待结算', variant: 'pending' },
  rejected: { label: '已拒单', variant: 'rejected' },
  completed: { label: '已完成', variant: 'completed' },
  cancelled: { label: '已取消', variant: 'default' },
};

export default function OrdersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!token) return;

    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/v1/orders', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.code === 0) {
          setOrders(data.data.items || []);
        }
      } catch (err) {
        console.error('Fetch orders error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token]);

  if (authLoading || loading) {
    return (
      <Layout showFooter={true}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingText}>加载中...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={true}>
      {orders.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p className={styles.emptyText}>暂无订单记录</p>
          <Button variant="primary" onClick={() => router.push('/member')}>
            马上下单
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => {
            const statusInfo = STATUS_MAP[order.status] || { label: order.status, variant: 'default' };
            return (
              <div 
                key={order.id} 
                className={styles.orderCard}
                onClick={() => router.push(`/member/orders/${order.id}`)}
              >
                <div className={styles.cardHeader}>
                  <StatusBadge variant={statusInfo.variant}>
                    {statusInfo.label}
                  </StatusBadge>
                  <span className={styles.orderNo}>{order.orderNo}</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.venueName}>{order.venueName}</div>
                  <div className={styles.entryTime}>
                    {order.entryTime ? order.entryTime.slice(0, 16) : '-'}
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.duration}>
                    {order.durationMinutes > 0 
                      ? `${Math.floor(order.durationMinutes / 60)}小时${order.durationMinutes % 60}分钟`
                      : '未开始'}
                  </span>
                  <span className={styles.amount}>
                    ¥{order.finalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
