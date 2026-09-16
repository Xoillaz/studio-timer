'use client';

import { ReactNode } from 'react';
import styles from './StatusBadge.module.css';

export type StatusVariant = 'active' | 'pending' | 'completed' | 'rejected' | 'default';

export interface StatusBadgeProps {
  variant?: StatusVariant;
  children: ReactNode;
  className?: string;
}

export default function StatusBadge({ 
  variant = 'default', 
  children, 
  className = '' 
}: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
