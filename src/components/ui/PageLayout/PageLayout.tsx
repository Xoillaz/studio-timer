'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './PageLayout.module.css';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}

export default function PageLayout({ title, children, right }: PageLayoutProps) {
  const router = useRouter();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.right}>
          {right}
        </div>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
