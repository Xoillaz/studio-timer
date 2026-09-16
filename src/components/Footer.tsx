'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Footer.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
}

const memberNavs: NavItem[] = [
  {
    href: '/member',
    label: '租赁',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
        <path d="M15 13a3 3 0 1 0-6 0" />
      </svg>
    ),
  },
  {
    href: '/member/orders',
    label: '订单',
    requiresAuth: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: '/member/profile',
    label: '我的',
    requiresAuth: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function Footer() {
  const pathname = usePathname();
  const router = useRouter();
  const { member, hasActiveOrder } = useAuth();

  const handleNavClick = (item: NavItem, e: React.MouseEvent) => {
    if (item.requiresAuth && !member) {
      e.preventDefault();
      router.push('/login');
    }
  };

  // 判断租赁标签是否激活
  const isRentalActive = pathname === '/member' || pathname === '/member/active';

  return (
    <footer className={styles.footer}>
      <nav className={styles.nav}>
        {memberNavs.map((item) => {
          let isActive = pathname === item.href || 
            (item.href !== '/member' && pathname.startsWith(item.href));
          
          // 租赁页特殊处理：有进行中订单时，租赁标签显示激活状态
          if (item.href === '/member') {
            isActive = isRentalActive;
          }
          
          // 未登录时，我的页面跳转到登录页
          const href = item.requiresAuth && !member ? '/login' : item.href;
          
          // 租赁标签：有进行中订单时跳转到状态页
          const finalHref = item.href === '/member' && hasActiveOrder ? '/member/active' : href;
          
          return (
            <Link
              key={item.href}
              href={finalHref}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={(e) => handleNavClick(item, e)}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
