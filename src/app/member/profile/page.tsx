'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Toast, useToast } from '@/components/ui';
import ProfileHeader from '@/components/member/ProfileHeader';
import ProfileMenu from '@/components/member/ProfileMenu';
import styles from './page.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const { member, token, isLoading: authLoading, logout } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  // 跳转登录页
  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [authLoading, token, router]);

  const handleRecharge = () => {
    router.push('/member/recharge');
  };

  const handleWithdraw = () => {
    if (!member || member.balance <= 0) {
      showToast('info', '余额不足，无法提现');
      return;
    }
    showToast('info', '提现功能开发中，预计下次更新');
  };

  const handleContact = () => {
    showToast('info', '请联系客服：400-888-8888');
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      showToast('error', '登出失败，请重试');
    }
  };

  const menuGroups = [
    {
      items: [
        {
          label: '余额充值',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M9 9h6M9 15h6" />
            </svg>
          ),
          onClick: handleRecharge,
        },
        {
          label: '余额提现',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M9 11l3-3 3 3" />
            </svg>
          ),
          onClick: handleWithdraw,
        },
      ],
    },
    {
      items: [
        {
          label: '联系客服',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          ),
          onClick: handleContact,
        },
        {
          label: '登出',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          ),
          onClick: handleLogout,
          danger: true,
        },
      ],
    },
  ];

  if (authLoading) {
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
        {/* 背景层：头像 + 昵称 + 电话 */}
        <ProfileHeader name={member?.name || ''} phone={member?.phone || ''} />

        {/* 前景层：功能菜单 */}
        <div className={styles.contentSection}>
          <ProfileMenu groups={menuGroups} />
        </div>
      </div>

      <Toast {...toast} onClose={hideToast} />
    </Layout>
  );
}
