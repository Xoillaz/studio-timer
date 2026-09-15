'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/ui/PageLayout/PageLayout';
import Modal from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import styles from './active.module.css';

interface OrderInfo {
  id: number;
  orderNo: string;
  status: string;
  venueName: string;
  venuePricePerHour: number;
  entryTime: string | null;
  durationMinutes: number;
  baseAmount: number;
  extraAmount: number;
  finalAmount: number;
  equipmentTotal: number;
  currentAmount: number;
  equipments: Array<{
    name: string;
    pricePerUse: number;
    quantity: number;
    category?: string;
  }>;
}

interface EquipmentItem {
  id: number;
  name: string;
  pricePerUse: number;
  category: string;
  selectedCount: number;
}

const STATUS_MAP: Record<string, { label: string; variant: 'entering' | 'pending' | 'completed' | 'rejected' | 'default' }> = {
  entering: { label: '进行中', variant: 'entering' },
  partial_exit_pending: { label: '部分离场待审核', variant: 'pending' },
  pending_exit: { label: '离场待审核', variant: 'pending' },
  reviewing: { label: '审核中', variant: 'pending' },
  topup_pending: { label: '补差价待审核', variant: 'pending' },
  rejected: { label: '申请被拒', variant: 'rejected' },
  completed: { label: '已完成', variant: 'completed' },
  pending_settlement: { label: '待结算', variant: 'pending' },
};

function ActivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isLoading: authLoading, member } = useAuth();
  const orderId = searchParams.get('orderId');
  
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  
  // 中途离场弹窗状态
  const [exitPersonCount, setExitPersonCount] = useState<number>(1);
  const [exitRemark, setExitRemark] = useState<string>('');
  
  const [exiting, setExiting] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 计时器
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // 服务卡片标签页
  const [serviceTab, setServiceTab] = useState('equipment');
  const serviceTabs = [
    { key: 'equipment', label: '设备' },
    { key: 'supplies', label: '器材' },
    { key: 'consumables', label: '耗材' },
  ];

  // 模拟设备数据 - 实际应从API获取
  const [serviceItems, setServiceItems] = useState<EquipmentItem[]>([
    { id: 1, name: '相机', pricePerUse: 50, category: 'equipment', selectedCount: 0 },
    { id: 2, name: '灯光', pricePerUse: 30, category: 'equipment', selectedCount: 0 },
    { id: 3, name: '三脚架', pricePerUse: 20, category: 'equipment', selectedCount: 0 },
    { id: 4, name: '反光板', pricePerUse: 15, category: 'supplies', selectedCount: 0 },
    { id: 5, name: '背景纸', pricePerUse: 10, category: 'consumables', selectedCount: 0 },
    { id: 6, name: '电池', pricePerUse: 5, category: 'consumables', selectedCount: 0 },
  ]);

  const fetchOrder = useCallback(async () => {
    if (!token || !orderId) return;
    
    try {
      const res = await fetch(`/api/v1/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.code === 0) {
        setOrder(data.data);
        if (data.data.entryTime) {
          const entryTime = new Date(data.data.entryTime).getTime();
          const now = Date.now();
          setElapsedSeconds(Math.floor((now - entryTime) / 1000));
        }
      } else {
        setError(data.message || '获取订单失败');
      }
    } catch (err) {
      console.error('Fetch order error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, orderId]);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
      return;
    }

    if (token && orderId) {
      fetchOrder();
    }
  }, [token, authLoading, orderId, router, fetchOrder]);

  // 计时器更新
  useEffect(() => {
    if (!order || order.status !== 'entering') return;

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [order?.status]);

  // 计算当前费用
  const calculateCurrentFee = useCallback(() => {
    if (!order) return 0;
    
    const billableMinutes = Math.max(30, Math.floor(elapsedSeconds / 60));
    const hourlyRate = order.venuePricePerHour;
    const baseFee = (billableMinutes / 60) * hourlyRate;
    
    return Math.round(baseFee * 100) / 100;
  }, [order, elapsedSeconds]);

  // 切换服务标签页时过滤数据
  const filteredServices = serviceItems.filter(item => item.category === serviceTab);

  // 计算当前服务费用
  const currentServiceFee = serviceItems.reduce(
    (sum, item) => sum + item.pricePerUse * item.selectedCount,
    0
  );

  // 预估总价
  const totalEstimate = calculateCurrentFee() + currentServiceFee + (order?.equipmentTotal || 0);

  // 中途离场
  const handlePartialExit = async () => {
    if (!orderId) return;
    
    setExiting(true);
    setError('');

    try {
      const res = await fetch('/api/v1/orders/partial-exit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          orderId: parseInt(orderId),
          personCount: exitPersonCount,
          remark: exitRemark,
        }),
      });
      const data = await res.json();
      
      if (data.code === 0) {
        fetchOrder();
        setShowExitModal(false);
        setExitPersonCount(1);
        setExitRemark('');
        alert('中途离场记录已提交');
      } else {
        setError(data.message || '提交失败');
      }
    } catch (err) {
      console.error('Partial exit error:', err);
      setError('提交失败，请重试');
    } finally {
      setExiting(false);
    }
  };

  // 结束计时
  const handleEndTimer = async () => {
    if (!orderId) return;
    
    setExiting(true);
    setError('');

    try {
      const res = await fetch('/api/v1/orders/exit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: parseInt(orderId) }),
      });
      const data = await res.json();
      
      if (data.code === 0) {
        router.push(`/member/orders/${orderId}`);
      } else if (data.code === 4001) {
        alert(`余额不足，还需 ${data.details?.required} 元，请先充值`);
        router.push('/member/recharge');
      } else {
        setError(data.message || '结束失败');
      }
    } catch (err) {
      console.error('End timer error:', err);
      setError('结束失败，请重试');
    } finally {
      setExiting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <PageLayout title="使用中">
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      </PageLayout>
    );
  }

  if (!order) {
    return (
      <PageLayout title="使用中">
        <div className={styles.emptyContainer}>
          <p className={styles.emptyText}>{error || '订单不存在'}</p>
          <Button variant="primary" onClick={() => router.push('/member')}>
            返回首页
          </Button>
        </div>
      </PageLayout>
    );
  }

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, variant: 'default' };
  const currentFee = calculateCurrentFee();
  const showPendingStatus = ['partial_exit_pending', 'pending_exit', 'reviewing', 'topup_pending'].includes(order.status);

  // 待结算状态不允许加服务
  const canAddService = order.status === 'entering';

  return (
    <PageLayout title="使用中">
      {/* 状态卡片 */}
      <div 
        className={styles.statusCard}
        onClick={() => router.push(`/member/orders/${orderId}`)}
      >
        <div className={styles.statusCardContent}>
          <div className={styles.statusLeft}>
            <StatusBadge variant={statusInfo.variant}>
              {statusInfo.label}
            </StatusBadge>
            <span className={styles.timerValue}>
              {String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:
              {String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:
              {String(elapsedSeconds % 60).padStart(2, '0')}
            </span>
          </div>
          <div className={styles.statusRight}>
            <span className={styles.timerLabel}>使用时长</span>
          </div>
        </div>
      </div>

      {/* 服务卡片 - 标签页在卡片内部 */}
      <div className={styles.serviceCard}>
        <div className={styles.serviceTabs}>
          {serviceTabs.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.serviceTab} ${serviceTab === tab.key ? styles.active : ''}`}
              onClick={() => setServiceTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={styles.serviceList}>
          {filteredServices.map((item) => (
            <div key={item.id} className={styles.serviceItem}>
              <label className={styles.serviceLabel}>
                <input
                  type="checkbox"
                  checked={item.selectedCount > 0}
                  onChange={(e) => {
                    if (!canAddService) return;
                    setServiceItems(prev => prev.map(eq => 
                      eq.id === item.id 
                        ? { ...eq, selectedCount: e.target.checked ? 1 : 0 }
                        : eq
                    ));
                  }}
                  disabled={!canAddService}
                  className={styles.checkbox}
                />
                <span className={styles.serviceName}>{item.name}</span>
              </label>
              <span className={styles.servicePrice}>¥{item.pricePerUse}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 待审核状态提示 */}
      {showPendingStatus && (
        <div className={styles.pendingTip}>
          <span className={styles.pendingIcon}>⏳</span>
          {order.status === 'partial_exit_pending' && '部分人离场申请已提交，请等待管理员审核'}
          {order.status === 'pending_exit' && '离场申请已提交，请等待管理员审核'}
          {order.status === 'reviewing' && '账单审核中，请等待管理员确认'}
          {order.status === 'topup_pending' && '补差价申请已提交，请等待管理员审核'}
        </div>
      )}

      {/* 余额提示 */}
      <div className={styles.balanceTip}>
        当前余额：<span className={styles.balanceValue}>¥{member?.balance.toFixed(2)}</span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {/* 底部操作栏 */}
      <div className={styles.fixedBottom}>
        <div className={styles.bottomContent}>
          <div className={styles.priceSection}>
            <span className={styles.priceLabel}>预估价格 ¥{totalEstimate.toFixed(2)}</span>
            <button 
              className={styles.detailToggle}
              onClick={() => setShowDetail(!showDetail)}
            >
              明细 {showDetail ? '▲' : '▼'}
            </button>
          </div>
          <div className={styles.actionButtons}>
            {canAddService && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowExitModal(true)}
              >
                中途离场
              </Button>
            )}
            <Button
              variant="primary"
              size="small"
              onClick={() => setShowEndModal(true)}
            >
              结束
            </Button>
          </div>
        </div>
      </div>

      {/* 明细展开区域 */}
      {showDetail && (
        <div className={styles.detailPanel}>
          <div className={styles.detailRow}>
            <span>场地费（{order.venueName}）</span>
            <span>¥{currentFee.toFixed(2)}</span>
          </div>
          <div className={styles.detailRow}>
            <span>设备费</span>
            <span>¥{(order.equipmentTotal || 0).toFixed(2)}</span>
          </div>
          <div className={styles.detailRow}>
            <span>新增服务</span>
            <span>¥{currentServiceFee.toFixed(2)}</span>
          </div>
          <div className={`${styles.detailRow} ${styles.detailTotal}`}>
            <span>合计</span>
            <span>¥{totalEstimate.toFixed(2)}</span>
          </div>
          <p className={styles.detailTip}>* 实际费用以离场结算为准</p>
        </div>
      )}

      {/* 中途离场弹窗 */}
      <Modal
        open={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="中途离场"
      >
        <div className={styles.modalForm}>
          <div className={styles.formItem}>
            <label>离场人数</label>
            <input
              type="number"
              min="1"
              value={exitPersonCount}
              onChange={(e) => setExitPersonCount(parseInt(e.target.value) || 1)}
              className={styles.input}
            />
          </div>
          <div className={styles.formItem}>
            <label>备注</label>
            <textarea
              value={exitRemark}
              onChange={(e) => setExitRemark(e.target.value)}
              placeholder="可选填写"
              className={styles.textarea}
            />
          </div>
          <p className={styles.modalTip}>* 中途离场记录时间轴，不影响账单，不中断计时</p>
          <div className={styles.modalActions}>
            <Button 
              variant="secondary" 
              onClick={() => setShowExitModal(false)}
            >
              取消
            </Button>
            <Button 
              variant="primary" 
              onClick={handlePartialExit}
              loading={exiting}
            >
              {exiting ? '提交中...' : '确认'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 结束确认弹窗 */}
      <Modal
        open={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="确认结束"
      >
        <div className={styles.modalForm}>
          <div className={styles.endInfo}>
            <div className={styles.endInfoRow}>
              <span>使用时长</span>
              <span>
                {String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:
                {String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:
                {String(elapsedSeconds % 60).padStart(2, '0')}
              </span>
            </div>
            <div className={styles.endInfoRow}>
              <span>当前费用</span>
              <span>¥{totalEstimate.toFixed(2)}</span>
            </div>
          </div>
          {member && member.balance < totalEstimate && (
            <p className={styles.modalWarning}>
              余额不足，结束后需补缴费用
            </p>
          )}
          <div className={styles.modalActions}>
            <Button 
              variant="secondary" 
              onClick={() => setShowEndModal(false)}
            >
              取消
            </Button>
            <Button 
              variant="danger" 
              onClick={handleEndTimer}
              loading={exiting}
            >
              {exiting ? '处理中...' : '确认结束'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}

export default function ActivePage() {
  return (
    <Suspense fallback={
      <PageLayout title="使用中">
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      </PageLayout>
    }>
      <ActivePageContent />
    </Suspense>
  );
}
