'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import styles from './scan.module.css';

interface OrderInfo {
  id: number;
  orderNo: string;
  venueName: string;
  entryTime: string | null;
  baseAmount: number;
  finalAmount: number;
  equipmentTotal: number;
  status: string;
  equipments: Array<{
    name: string;
    pricePerUse: number;
    quantity: number;
    subtotal: number;
  }>;
}

function ScanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isLoading: authLoading, refreshMember } = useAuth();
  const orderId = searchParams.get('orderId');
  
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
      return;
    }

    if (!orderId) {
      setError('缺少订单信息');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/v1/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (data.code === 0) {
          setOrder(data.data);
        } else {
          setError(data.message || '获取订单失败');
        }
      } catch (err) {
        console.error('Fetch order error:', err);
        setError('获取订单失败');
      } finally {
        setLoading(false);
      }
    };

    if (token && orderId) {
      fetchOrder();
    }
  }, [token, authLoading, orderId, router]);

  const handleEntry = async () => {
    if (!orderId) return;
    
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/v1/orders/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: parseInt(orderId) }),
      });
      const data = await res.json();
      
      if (data.code === 0) {
        await refreshMember();
        router.push(`/member/active?orderId=${orderId}`);
      } else if (data.code === 4001) {
        setShowInsufficientBalance(true);
      } else {
        setError(data.message || '入场失败');
      }
    } catch (err) {
      console.error('Entry error:', err);
      setError('入场失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
        <button 
          className={styles.btn}
          onClick={() => router.back()}
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>订单信息</h3>
        <div className={styles.info}>
          <div className={styles.infoRow}>
            <span className={styles.label}>订单号</span>
            <span className={styles.value}>{order?.orderNo}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>场地</span>
            <span className={styles.value}>{order?.venueName}</span>
          </div>
          {order?.equipments && order.equipments.length > 0 && (
            <div className={styles.infoRow}>
              <span className={styles.label}>设备</span>
              <span className={styles.value}>
                {order.equipments.map(e => e.name).join('、')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>费用说明</h3>
        <div className={styles.feeList}>
          <div className={styles.feeRow}>
            <span>设备费（立即扣除）</span>
            <span className={styles.feeValue}>¥{order?.equipmentTotal || 0}</span>
          </div>
          <div className={styles.feeRow}>
            <span>场地费（离场时结算）</span>
            <span className={styles.feeValue}>按实际时长计费</span>
          </div>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.fixedBottom}>
        <button
          className={styles.primaryBtn}
          onClick={handleEntry}
          disabled={submitting}
        >
          {submitting ? '处理中...' : '确认入场'}
        </button>
      </div>

      {showInsufficientBalance && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>余额不足</h3>
            <p>需要充值后才能入场</p>
            <div className={styles.modalActions}>
              <button 
                className={styles.secondaryBtn}
                onClick={() => setShowInsufficientBalance(false)}
              >
                取消
              </button>
              <button 
                className={styles.primaryBtn}
                onClick={() => router.push('/member/recharge')}
              >
                去充值
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ScanPage() {
  return (
    <Layout title="扫码入场">
      <Suspense fallback={
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      }>
        <ScanPageContent />
      </Suspense>
    </Layout>
  );
}
