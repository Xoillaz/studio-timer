'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/ui/PageLayout/PageLayout';
import { OrderDetailContent, OrderStatusContent } from '@/components/member/OrderContent';
import { OrderDetail, VasServiceItem } from '@/components/member/types';
import styles from './order-detail.module.css';

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
            // 构建时间轴数据
            const timeline = [
              { action: 'created', time: data.data.createdAt, details: '' },
            ];

            // 增值服务 - 按下单时间分组显示
            if (data.data.vasServices && data.data.vasServices.length > 0) {
              const grouped: { [key: string]: VasServiceItem[] } = {};
              data.data.vasServices.forEach((v: VasServiceItem) => {
                const timeKey = v.createdAt ? v.createdAt.substring(0, 19) : 'unknown';
                if (!grouped[timeKey]) grouped[timeKey] = [];
                grouped[timeKey].push(v);
              });
              
              Object.entries(grouped).forEach(([time, items]) => {
                const details = items.map(v => `${v.name}×${v.quantity}`).join('、');
                timeline.push({
                  action: 'vas_added',
                  time: time !== 'unknown' ? time : data.data.entryTime,
                  details
                });
              });
            }
            
            // 结束订单
            if (data.data.exitTime) {
              timeline.push({ action: 'order_completed', time: data.data.exitTime, details: '' });
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
      <PageLayout title="订单内容">
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      </PageLayout>
    );
  }

  if (!order) {
    return (
      <PageLayout title="订单内容">
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

  return (
    <PageLayout title="订单内容">
      {/* 内容容器 - 类似状态页的 pageContainer */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* 标签栏 */}
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
          {activeTab === 'detail' && (
            <OrderDetailContent 
              order={order} 
              currentAmount={order.baseAmount}
            />
          )}

          {activeTab === 'status' && (
            <OrderStatusContent timeline={order.timeline || []} />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
