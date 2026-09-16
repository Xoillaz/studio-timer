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
  remark?: string;
}

function ActivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isLoading: authLoading, checkActiveOrder } = useAuth();
  const orderId = searchParams.get('orderId');
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceItems, setServiceItems] = useState<EquipmentItem[]>([]);
  // 固化的增值服务项（已下单，还未结算）
  const [fixedItems, setFixedItems] = useState<EquipmentItem[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  
  const [exitPersonCount, setExitPersonCount] = useState<number>(1);
  const [exitRemark, setExitRemark] = useState<string>('');
  const [showTimerInfo, setShowTimerInfo] = useState(false);
  
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

  // 增值服务 - 按分组（设备/耗材）
  const serviceGroups = [
    { key: 'equipment', label: '设备', items: serviceItems.filter(i => i.category === 'equipment') },
    { key: 'consumables', label: '耗材', items: serviceItems.filter(i => i.category === 'consumables') },
  ];

  // 获取增值服务列表
  const fetchVasServices = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/vasServices?is_active=true');
      const data = await res.json();
      if (data.code === 0 && data.data.items) {
        setServiceItems(data.data.items.map((item: any) => ({
          ...item,
          selectedCount: 0,
        })));
      }
    } catch (err) {
      console.error('获取增值服务失败:', err);
    }
  }, []);

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

        // 增值服务 - 按下单时间分组显示
        if (data.data.vasServices && data.data.vasServices.length > 0) {
          // 按秒级时间分组（去掉毫秒）
          const grouped: { [key: string]: any[] } = {};
          data.data.vasServices.forEach((v: any) => {
            // 按秒级时间分组（取前19字符：去掉毫秒）
            const timeKey = v.createdAt ? v.createdAt.substring(0, 19) : 'unknown';
            if (!grouped[timeKey]) grouped[timeKey] = [];
            grouped[timeKey].push(v);
          });
          
          // 每组生成一条时间轴记录
          Object.entries(grouped).forEach(([time, items]: [string, any[]]) => {
            const details = items.map(v => `${v.name}×${v.quantity}`).join('、');
            timeline.push({
              action: 'vas_added',
              time: time !== 'unknown' ? time : data.data.entryTime,
              details
            });
          });
        }

        // 部分人离场 - 每一次都独立显示
        if (data.data.partialExits && data.data.partialExits.length > 0) {
          data.data.partialExits.forEach((pe: any) => {
            timeline.push({
              action: 'partial_exit',
              time: pe.createdAt,
              details: `${pe.personCount}人离场`
            });
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
    // 等待 auth 加载完成
    if (authLoading) return;

    if (!token) {
      router.push('/login');
      return;
    }

    if (orderId) {
      fetchOrder();
    }
  }, [authLoading, token, orderId, router, fetchOrder]);

  // 防止 loading 状态卡住
  useEffect(() => {
    // 如果 auth 已加载但 loading 仍是 true（可能是 fetchOrder 没被调用），尝试重新获取
    if (!authLoading && loading && token && orderId) {
      fetchOrder();
    }
  }, [authLoading, loading, token, orderId, fetchOrder]);

  // 获取增值服务列表
  useEffect(() => {
    fetchVasServices();
  }, [fetchVasServices]);

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
    
    // 按半小时计费，向上取整
    const billableHalfHours = Math.ceil(elapsedSeconds / 1800);
    const hourlyRate = order.venuePricePerHour;
    const baseFee = billableHalfHours * hourlyRate / 2;
    
    return Math.round(baseFee * 100) / 100;
  }, [order, elapsedSeconds]);

  // 计算计费时长（小时，保留一位小数）
  const billableHours = order ? Math.ceil(elapsedSeconds / 1800) / 2 : 0;

  // 计算当前服务费用
  const currentServiceFee = serviceItems.reduce(
    (sum, item) => sum + item.pricePerUse * item.selectedCount,
    0
  );

  // 计算固化服务费用
  const fixedServiceFee = fixedItems.reduce(
    (sum, item) => sum + item.pricePerUse * item.selectedCount,
    0
  );

  const totalEstimate = calculateCurrentFee() + currentServiceFee + fixedServiceFee + (order?.equipmentTotal || 0) + (order?.vasServiceTotal || 0);

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

  // 下单增值服务
  const handleOrderVas = async () => {
    // 获取当前选中的服务项
    const selectedItems = serviceItems.filter(item => item.selectedCount > 0);
    if (selectedItems.length === 0 || !token || !orderId) return;

    try {
      const res = await fetch('/api/v1/orders/vas-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: parseInt(orderId),
          items: selectedItems.map(item => ({
            vasServiceId: item.id,
            quantity: item.selectedCount,
          })),
        }),
      });
      const data = await res.json();

      if (data.code === 0) {
        // 合并到固化列表（同名项累加数量）
        setFixedItems(prev => {
          const newFixed = [...prev];
          selectedItems.forEach(item => {
            const existIdx = newFixed.findIndex(f => f.id === item.id);
            if (existIdx >= 0) {
              newFixed[existIdx] = {
                ...newFixed[existIdx],
                selectedCount: newFixed[existIdx].selectedCount + item.selectedCount
              };
            } else {
              newFixed.push(item);
            }
          });
          return newFixed;
        });

        // 清空当前选中数量
        setServiceItems(prev => prev.map(item => ({ ...item, selectedCount: 0 })));

        // 刷新订单，获取最新增值服务数据
        fetchOrder();
      } else {
        alert(data.message || '添加失败');
      }
    } catch (err) {
      console.error('Order vas error:', err);
      alert('添加失败，请重试');
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
                            {item.remark && (
                              <span className={styles.itemRemark}>
                                {item.remark}
                              </span>
                            )}
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
            <span>场地费（{order?.venueName}） × {billableHours} 小时</span>
            <span>¥{currentFee.toFixed(2)}</span>
          </div>
          {/* 显示当前选中的增值服务项 */}
          {serviceItems.filter(item => item.selectedCount > 0).map(item => (
            <div key={item.id} className={styles.detailRow}>
              <span>{item.name} × {item.selectedCount}</span>
              <span>¥{(item.pricePerUse * item.selectedCount).toFixed(2)}</span>
            </div>
          ))}
          {/* 显示固化的增值服务项 */}
          {fixedItems.map((item, idx) => (
            <div key={`fixed-${item.id}-${idx}`} className={styles.detailRow}>
              <span>{item.name} × {item.selectedCount}</span>
              <span>¥{(item.pricePerUse * item.selectedCount).toFixed(2)}</span>
            </div>
          ))}
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
            <div className={styles.priceHintRow}>
              <span className={styles.priceHint}>预估价格</span>
              <span className={styles.priceInfoWrapper}>
                <span
                  className={styles.priceInfo}
                  onClick={() => setShowTimerInfo(!showTimerInfo)}
                >?</span>
                {showTimerInfo && (
                  <span className={styles.priceInfoText}>按半小时计费，不足30分钟按30分钟计</span>
                )}
              </span>
            </div>
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
                  onClick={handleOrderVas}
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
