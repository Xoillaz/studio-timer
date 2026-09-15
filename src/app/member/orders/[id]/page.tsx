'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/ui/PageLayout/PageLayout';
import Tabs from '@/components/ui/Tabs/Tabs';
import styles from './order-detail.module.css';

interface OrderDetail {
  id: number;
  orderNo: string;
  status: string;
  venueName: string;
  venuePricePerHour: number;
  entryTime: string | null;
  exitTime: string | null;
  durationMinutes: number;
  baseAmount: number;
  extraAmount: number;
  finalAmount: number;
  equipmentTotal: number;
  equipments: Array<{
    name: string;
    pricePerUse: number;
    quantity: number;
    subtotal: number;
  }>;
  leaderName: string | null;
  leaderPhone: string | null;
  remark: string | null;
  createdAt: string;
  rejectReason: string | null;
  timeline: Array<{
    action: string;
    time: string;
    details?: string;
  }>;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending_entry: { label: '待入场', className: 'pending' },
  entering: { label: '进行中', className: 'entering' },
  partial_exit_pending: { label: '部分离场待审核', className: 'pending' },
  pending_exit: { label: '离场待审核', className: 'pending' },
  reviewing: { label: '审核中', className: 'pending' },
  topup_pending: { label: '补差价待审核', className: 'pending' },
  pending_settlement: { label: '待结算', className: 'pending' },
  rejected: { label: '已拒单', className: 'rejected' },
  completed: { label: '已完成', className: 'completed' },
  cancelled: { label: '已取消', className: 'cancelled' },
};

const TIMELINE_LABELS: Record<string, string> = {
  created: '创建订单',
  confirmed: '已确认',
  add_item: '增加项目',
  partial_exit: '中途离场',
  end_timer: '结束计时',
  pending_settlement: '待结算',
};

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isLoading: authLoading } = useAuth();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('detail');

  const tabs = [
    { key: 'detail', label: '订单详情' },
    { key: 'status', label: '订单状态' },
  ];

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
      return;
    }

    if (token && orderId) {
      const fetchOrder = async () => {
        try {
          const res = await fetch(`/api/v1/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const data = await res.json();
          
          if (data.code === 0) {
            // 模拟时间轴数据 - 实际应从API获取
            const timeline = [
              { action: 'created', time: data.data.createdAt, details: '' },
            ];
            
            if (data.data.confirmedAt) {
              timeline.push({ action: 'confirmed', time: data.data.confirmedAt, details: '' });
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
                details: `${data.data.partialExitPersonCount || 1}人${data.data.partialExitRemark ? ` - ${data.data.partialExitRemark}` : ''}` 
              });
            }
            
            if (data.data.exitTime) {
              timeline.push({ action: 'end_timer', time: data.data.exitTime, details: '' });
              timeline.push({ action: 'pending_settlement', time: data.data.exitTime, details: '' });
            }
            
            setOrder({ ...data.data, timeline });
          }
        } catch (err) {
          console.error('Fetch order error:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchOrder();
    }
  }, [token, authLoading, orderId, router]);

  if (authLoading || loading) {
    return (
      <PageLayout title="订单详情">
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      </PageLayout>
    );
  }

  if (!order) {
    return (
      <PageLayout title="订单详情">
        <div className={styles.empty}>
          <p>订单不存在</p>
          <button 
            className={styles.btn}
            onClick={() => router.push('/member/orders')}
          >
            返回订单列表
          </button>
        </div>
      </PageLayout>
    );
  }

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, className: '' };

  return (
    <PageLayout title="订单详情">
      {/* 标签页 */}
      <Tabs 
        tabs={tabs} 
        activeKey={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'detail' ? (
        <div className={styles.detailContent}>
          {/* 状态 */}
          <div className={`${styles.statusBadge} ${styles[statusInfo.className]}`}>
            {statusInfo.label}
          </div>

          {/* 当前进度 */}
          <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>当前进度</h3>
            <div className={styles.infoRow}>
              <span>{statusInfo.label}</span>
            </div>
          </div>

          {/* 订单信息 */}
          <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>订单信息</h3>
            <div className={styles.infoRow}>
              <span className={styles.label}>订单号</span>
              <span className={styles.value}>{order.orderNo}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>下单时间</span>
              <span className={styles.value}>
                {order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN') : '-'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>支付方式</span>
              <span className={styles.value}>余额支付</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>场地</span>
              <span className={styles.value}>{order.venueName}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>场地单价</span>
              <span className={styles.value}>¥{order.venuePricePerHour}/小时</span>
            </div>
          </div>

          {/* 设备信息 */}
          {order.equipments && order.equipments.length > 0 && (
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>设备</h3>
              {order.equipments.map((eq, index) => (
                <div key={index} className={styles.infoRow}>
                  <span className={styles.label}>{eq.name} × {eq.quantity}</span>
                  <span className={styles.value}>¥{eq.subtotal}</span>
                </div>
              ))}
            </div>
          )}

          {/* 时间信息 */}
          <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>时间信息</h3>
            <div className={styles.infoRow}>
              <span className={styles.label}>入场时间</span>
              <span className={styles.value}>
                {order.entryTime ? new Date(order.entryTime).toLocaleString('zh-CN') : '-'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>离场时间</span>
              <span className={styles.value}>
                {order.exitTime ? new Date(order.exitTime).toLocaleString('zh-CN') : '-'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>使用时长</span>
              <span className={styles.value}>{formatDuration(order.durationMinutes)}</span>
            </div>
          </div>

          {/* 费用信息 */}
          <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>费用信息</h3>
            <div className={styles.infoRow}>
              <span className={styles.label}>场地费</span>
              <span className={styles.value}>¥{order.baseAmount.toFixed(2)}</span>
            </div>
            {order.extraAmount > 0 && (
              <div className={styles.infoRow}>
                <span className={styles.label}>额外费用</span>
                <span className={styles.value}>¥{order.extraAmount.toFixed(2)}</span>
              </div>
            )}
            <div className={`${styles.infoRow} ${styles.totalRow}`}>
              <span className={styles.label}>合计</span>
              <span className={`${styles.value} ${styles.totalValue}`}>¥{order.finalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* 联系管理员 */}
          <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>联系管理员</h3>
            <div className={styles.contactInfo}>
              <span>请联系管理员处理</span>
            </div>
          </div>

          {/* 拒单原因 */}
          {order.rejectReason && (
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>拒单原因</h3>
              <p className={styles.rejectReason}>{order.rejectReason}</p>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.statusContent}>
          {/* 时间轴 */}
          <div className={styles.timeline}>
            {order.timeline && order.timeline.length > 0 ? (
              order.timeline.map((item, index) => (
                <div key={index} className={styles.timelineItem}>
                  <div className={styles.timelineDot}>
                    {index === order.timeline!.length - 1 ? (
                      <span className={styles.dotActive}>●</span>
                    ) : (
                      <span className={styles.dot}>●</span>
                    )}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineLabel}>
                      {TIMELINE_LABELS[item.action] || item.action}
                      {item.details && <span className={styles.timelineDetails}>{item.details}</span>}
                    </div>
                    <div className={styles.timelineTime}>
                      {item.time ? new Date(item.time).toLocaleString('zh-CN') : '-'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyTimeline}>
                暂无时间轴记录
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
