'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Toast, useToast } from '@/components/ui';
import HeaderSection from '@/components/member/HeaderSection';
import TitleSection from '@/components/member/TitleSection';
import VenueCard from '@/components/member/VenueCard';
import styles from './page.module.css';

interface Venue {
  id: number;
  name: string;
  pricePerHour: number;
  description: string;
}

export default function MemberHomePage() {
  const router = useRouter();
  const { member, token, isLoading: authLoading } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  // 合并认证和获取数据的 useEffect
  useEffect(() => {
    // 未登录则跳转登录页
    if (!authLoading && !token) {
      router.push('/login');
      return;
    }

    // 未获取到 token 时不请求数据
    if (!token) return;

    const fetchData = async () => {
      try {
        const venuesRes = await fetch('/api/v1/venues?is_active=true');
        const venuesData = await venuesRes.json();

        if (venuesData.code === 0) {
          const sortedVenues = (venuesData.data.items || []).sort(
            (a: Venue, b: Venue) => a.pricePerHour - b.pricePerHour
          );
          setVenues(sortedVenues);
          setError(null);
        } else {
          setError('获取场地列表失败');
        }
      } catch (err) {
        console.error('Fetch data error:', err);
        setError('网络连接失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, token, router]);

  const handleSelectVenue = useCallback(async (venue: Venue) => {
    if (submitting) return;

    // 检查余额（按3小时预估）
    const estimatedPrice = venue.pricePerHour * 3;
    if (member && member.balance < estimatedPrice) {
      const diff = estimatedPrice - member.balance;
      showToast('warning', `余额不足，需要充值 ¥${diff.toFixed(2)} 才能下单`);
      setTimeout(() => router.push('/member/recharge'), 1500);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          venueId: venue.id,
          equipmentIds: [],
        }),
      });
      const data = await res.json();

      if (data.code === 0) {
        router.push(`/member/active?orderId=${data.data.orderId}`);
      } else {
        showToast('error', data.message || '创建订单失败，请重试');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showToast('error', '网络连接失败，请检查网络后重试');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, member, token, showToast, router]);

  if (authLoading || loading) {
    return (
      <Layout showFooter={true}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingText}>加载中...</span>
        </div>
        <Toast {...toast} onClose={hideToast} />
      </Layout>
    );
  }

  return (
    <Layout showFooter={true}>
      <div className={styles.pageContainer}>
        {/* 标题区域 - 主题色背景 + 余额信息 */}
        <HeaderSection balance={member?.balance ?? 0} />

        {/* 标题和副标题 + 卡片列表 - 灰色圆角背景 */}
        <div className={styles.contentSection}>
          <TitleSection />

          {/* 卡片列表 */}
          <div className={styles.venueList}>
            {error ? (
              <div className={styles.errorState}>
                <p className={styles.errorText}>{error}</p>
              </div>
            ) : venues.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>暂无可用场地</p>
              </div>
            ) : (
              venues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  onClick={() => handleSelectVenue(venue)}
                  disabled={submitting}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toast 提示 */}
      <Toast {...toast} onClose={hideToast} />
    </Layout>
  );
}
