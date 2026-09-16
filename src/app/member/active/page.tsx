'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Modal from '@/components/ui/Modal/Modal';
import { Button, Icon } from '@/components/ui';
import { OrderDetailContent, OrderStatusContent } from '@/components/member/OrderContent';
import { OrderDetail } from '@/components/member/types';
import styles from './active.module.css';

interface EquipmentItem {
  id: number;
  name: string;
  pricePerUse: number;
  category: string;
  selectedCount: number;
}

function ActivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isLoading: authLoading, checkActiveOrder } = useAuth();
  const orderId = searchParams.get('orderId');
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  
  const [exitPersonCount, setExitPersonCount] = useState<number>(1);
  const [exitRemark, setExitRemark] = useState<string>('');
  
  const [exiting, setExiting] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState('vas');
  const tabs = [
    { key: 'vas', label: '增值服务' },
    { key: 'status', label: '订单状态' },
  ];

  const [serviceItems, setServiceItems] = useState<EquipmentItem[]>([
    { id: 1, name: '相机', pricePerUse: 50, category: 'equipment', selectedCount: 0 },
    { id: 2, name: '灯光', pricePerUse: 30, category: 'equipment', selectedCount: 0 },
    { id: 3, name: '三脚架', pricePerUse: 20, category: 'equipment', selectedCount: 0 },
    { id: 4, name: '反光板', pricePerUse: 15, category: 'supplies', selectedCount: 0 },
    { id: 5, name: '背景纸', pricePerUse: 10, category: 'consumables', selectedCount: 0 },
    { id: 6, name: '电池', pricePerUse: 5, category: 'consumables', selectedCount: 0 },
  ]);

  // 增值服务 - 按分组（设备/器材/耗材）
  const serviceGroups = [
    { key: 'equipment', label: '设备', items: serviceItems.filter(i => i.category === 'equipment') },
    { key: 'supplies', label: '器材', items: serviceItems.filter(i => i.category === 'supplies') },
    { key: 'consumables', label: '耗材', items: serviceItems.filter(i => i.category === 'consumables') },
  ];

  const fetchOrder = useCallback(async () => {
    if (!token || !orderId) return;
    
    try {
      const res = await fetch(`/api/v1/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.code === 0) {
        // 构建时间轴数据
        const timeline = [
          { action: 'created', time: data.data.createdAt, details: '' },
        ];
        
        if (data.data.entryTime) {
          timeline.push({ action: 'confirmed', time: data.data.entryTime, details: '已入场' });
        }
        
        if (data.data.equipments && data.data.equipments.length > 0) {
          timeline.push({ 
            action: 'add_item', 
            time: data.data.entryTime, 
            details: data.data.equipments.map((e: any) => `${e.name}×${e.quantity}`).join(', ') 
          });
        }
        
        if (data.data.partialExitTime) {
          timeline.push({ 
            action: 'partial_exit', 
            time: data.data.partialExitTime, 
            details: `${data.data.partialExitPersonCount || 1}人离场` 
          });
        }
        
        if (data.data.exitTime) {
          timeline.push({ action: 'end_timer', time: data.data.exitTime, details: '已离场' });
        }
        
        setOrder({ ...data.data, timeline });
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

  useEffect(() => {
    if (!order || order.status !== 'entering') return;

    // 启动计时器前，先根据入场时间计算已过秒数
    if (order.entryTime) {
      const entryTime = new Date(order.entryTime).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - entryTime) / 1000);
      if (elapsed >= 0) {
        setElapsedSeconds(elapsed);
      }
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [order?.status, order?.entryTime]);

  const calculateCurrentFee = useCallback(() => {
    if (!order) return 0;
    
    const billableMinutes = Math.max(30, Math.floor(elapsedSeconds / 60));
    const hourlyRate = order.venuePricePerHour;
    const baseFee = (billableMinutes / 60) * hourlyRate;
    
    return Math.round(baseFee * 100) / 100;
  }, [order, elapsedSeconds]);

  // 计算当前服务费用
  const currentServiceFee = serviceItems.reduce(
    (sum, item) => sum + item.pricePerUse * item.selectedCount,
    0
  );

  const totalEstimate = calculateCurrentFee() + currentServiceFee + (order?.equipmentTotal || 0);

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
        setShowEndModal(false);
        checkActiveOrder();
        router.push('/member');
      } else {
        setError(data.message || '提交失败');
      }
    } catch (err) {
      console.error('End timer error:', err);
      setError('提交失败，请重试');
    } finally {
      setExiting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout showFooter={true}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <span>加载中...</span>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout showFooter={true}>
        <div className={styles.emptyContainer}>
          <p>{error || '订单不存在'}</p>
          <Button variant="primary" onClick={() => router.push('/member')}>
            返回首页
          </Button>
        </div>
      </Layout>
    );
  }

  const currentFee = calculateCurrentFee();
  const showPendingStatus = ['partial_exit_pending', 'pending_exit', 'reviewing', 'topup_pending'].includes(order.status);

  return (
    <Layout showFooter={true}>
      <div className={styles.pageContainer}>
        {/* 背景层：计时器 + 使用时长 */}
        <div className={styles.headerSection}>
          <div className={styles.timerContainer}>
            <span className={styles.timerValue}>
              {String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:
              {String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:
              {String(elapsedSeconds % 60).padStart(2, '0')}
            </span>
            <span className={styles.timerLabel}>使用时长</span>
          </div>
        </div>

        {/* 前景层：标签栏 + 内容 */}
        <div className={styles.contentSection}>
          {/* 主标签栏 */}
          <div className={styles.tabBar}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`${styles.tab} ${activeTab === tab.key ? styles.active : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 标签内容 */}
          <div className={styles.tabContent}>
            {/* 增值服务 */}
            {activeTab === 'vas' && (
              <div className={styles.serviceList}>
                {serviceGroups.map((group) => (
                  <div key={group.key} className={styles.serviceGroup}>
                    <div className={styles.groupHeader}>{group.label}</div>
                    <div className={styles.groupItems}>
                      {group.items.map((item) => (
                        <div key={item.id} className={styles.serviceItem}>
                          <div className={styles.itemLeft}>
                            <span className={styles.itemTitle}>{item.name}</span>
                            <input
                              type="text"
                              placeholder="备注型号"
                              className={styles.itemRemark}
                            />
                          </div>
                          <div className={styles.itemRight}>
                            <span className={styles.itemPrice}>¥{item.pricePerUse}</span>
                            <div className={styles.itemCtrl}>
                              <button 
                                className={styles.itemBtn}
                                onClick={() => {
                                  setServiceItems(prev => prev.map(eq => 
                                    eq.id === item.id 
                                      ? { ...eq, selectedCount: Math.max(0, eq.selectedCount - 1) }
                                      : eq
                                  ));
                                }}
                              >-</button>
                              <span className={styles.itemCount}>{item.selectedCount}</span>
                              <button 
                                className={styles.itemBtn}
                                onClick={() => {
                                  setServiceItems(prev => prev.map(eq => 
                                    eq.id === item.id 
                                      ? { ...eq, selectedCount: eq.selectedCount + 1 }
                                      : eq
                                  ));
                                }}
                              >+</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 订单状态 */}
            {activeTab === 'status' && order && (
              <OrderStatusContent timeline={order.timeline || []} />
            )}
          </div>
        </div>
      </div>

      {/* 明细抽屉 */}
      {showDetail && (
        <div className={styles.detailPanel}>
          <div className={styles.detailRow}>
            <span>场地费（{order?.venueName}）</span>
            <span>¥{currentFee.toFixed(2)}</span>
          </div>
          <div className={styles.detailRow}>
            <span>设备费</span>
            <span>¥{(order?.equipmentTotal || 0).toFixed(2)}</span>
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

      {/* 底部操作栏 - 固定在导航栏上方 */}
      <div className={styles.fixedBottom}>
        <div className={styles.bottomContent}>
          <div className={styles.priceSection}>
            <span className={styles.priceLabel}>¥{totalEstimate.toFixed(2)}</span>
            <span className={styles.priceHint}>预估价格</span>
          </div>
          <div className={styles.rightSection}>
            <button 
              className={styles.detailToggle}
              onClick={() => setShowDetail(!showDetail)}
            >
              明细 {showDetail ? '▲' : '▼'}
            </button>
            <div className={styles.actionButtons}>
              {currentServiceFee > 0 && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    // TODO: 调用增值服务下单接口
                  }}
                >
                  下单
                </Button>
              )}
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowExitModal(true)}
              >
                中途离场
              </Button>
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
      </div>

      {error && <p className={styles.error}>{error}</p>}

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
              placeholder="可选"
              className={styles.textarea}
            />
          </div>
          <div className={styles.modalButtons}>
            <Button variant="secondary" onClick={() => setShowExitModal(false)}>
              取消
            </Button>
            <Button 
              variant="primary" 
              onClick={handlePartialExit}
              disabled={exiting}
            >
              {exiting ? '提交中...' : '确认'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 结束弹窗 */}
      <Modal
        open={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="确认结束"
      >
        <div className={styles.modalForm}>
          <p className={styles.modalText}>
            确定要结束计时吗？费用将根据实际使用时长计算。
          </p>
          <div className={styles.modalButtons}>
            <Button variant="secondary" onClick={() => setShowEndModal(false)}>
              取消
            </Button>
            <Button 
              variant="primary" 
              onClick={handleEndTimer}
              disabled={exiting}
            >
              {exiting ? '提交中...' : '确认结束'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

export default function ActivePage() {
  return <ActivePageContent />;
}
