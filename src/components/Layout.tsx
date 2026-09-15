'use client';

import React from 'react';
import Header from './Header';
import Footer from './Footer';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showFooter?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function Layout({
  children,
  title,
  showFooter = true,
  showBack = false,
  onBack,
  right,
}: LayoutProps) {
  // 有 title 或需要显示返回键时都显示 Header
  const showHeader = title || showBack;
  
  return (
    <div className={styles.layout}>
      {showHeader && (
        <Header 
          title={title || ''} 
          showBack={showBack} 
          onBack={onBack}
          right={right}
        />
      )}
      <main className={`${styles.main} ${showFooter ? styles.withFooter : ''}`}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
