'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import styles from './pending.module.css';

interface Order {
  id: number;
  orderNo: string;
  status: string;
  memberName: string;
  memberPhone: string;
  venueName: string;
  entryTime: string;
  currentAmount: number;
  equipmentTotal: number;
  createdAt: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending_exit: { label: '待离场审核', color: '#ff9800' },
  pending_bill: { label: '待账单审核', color: '#2196f3' },
  partial_exit_pending: { label: '部分人离场', color: '#9c27b0' },
};

export default function PendingPage() {
  const { token } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [extraAmount, setExtraAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingOrders();
  }, [token]);

  const fetchPendingOrders = async () => {
    try {
      const res = await fetch('/api/v1/admin/orders/pending', {
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

  const handleApprove = async () => {
    if (!selectedOrder) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/v1/admin/orders/${selectedOrder.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: action,
          extraAmount: extraAmount ? parseFloat(extraAmount) : 0,
          remark,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert(data.data.message);
        setShowModal(false);
        fetchPendingOrders();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Approve failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const openModal = (order: Order, actionType: 'approve' | 'reject') => {
    setSelectedOrder(order);
    setAction(actionType);
    setExtraAmount('');
    setRemark('');
    setShowModal(true);
  };

  if (loading) {
    return <div className={styles.loading}>加载中...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>待审核列表</h1>

      {orders.length === 0 ? (
        <div className={styles.empty}>暂无待审核订单</div>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <div key={order.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.orderNo}>{order.orderNo}</span>
                <span
                  className={styles.status}
                  style={{ background: statusMap[order.status]?.color || '#999' }}
                >
                  {statusMap[order.status]?.label || order.status}
                </span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.info}>
                  <span className={styles.label}>会员:</span>
                  {order.memberName} ({order.memberPhone})
                </div>
                <div className={styles.info}>
                  <span className={styles.label}>场地:</span>
                  {order.venueName}
                </div>
                <div className={styles.info}>
                  <span className={styles.label}>入场时间:</span>
                  {new Date(order.entryTime).toLocaleString()}
                </div>
                <div className={styles.info}>
                  <span className={styles.label}>当前费用:</span>
                  ¥{order.currentAmount.toFixed(2)}
                </div>
              </div>
              <div className={styles.cardFooter}>
                <button
                  className={styles.approveBtn}
                  onClick={() => openModal(order, 'approve')}
                >
                  审核
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>审核订单 {selectedOrder?.orderNo}</h2>
            <div className={styles.form}>
              {selectedOrder?.status === 'pending_exit' && (
                <div className={styles.field}>
                  <label>额外费用</label>
                  <input
                    type="number"
                    value={extraAmount}
                    onChange={(e) => setExtraAmount(e.target.value)}
                    placeholder="输入额外费用（如有）"
                  />
                </div>
              )}
              <div className={styles.field}>
                <label>备注</label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="输入审核备注"
                />
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.confirmBtn}
                  onClick={handleApprove}
                  disabled={processing}
                >
                  {processing ? '处理中...' : action === 'approve' ? '确认通过' : '确认拒绝'}
                </button>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                  disabled={processing}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
