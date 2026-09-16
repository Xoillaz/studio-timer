'use client';

import { useState, useEffect } from 'react';
import styles from './Toast.module.css';
import { Icon } from '@/components/ui';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  type?: ToastType;
  message: string;
  visible: boolean;
  onClose?: () => void;
  duration?: number;
}

export default function Toast({
  type = 'info',
  message,
  visible,
  onClose,
  duration = 3000,
}: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, duration, onClose]);

  if (!show && !visible) return null;

  const getIconName = () => {
    switch (type) {
      case 'success': return 'check';
      case 'error': return 'x';
      case 'warning': return 'alert-circle';
      case 'info': return 'info';
    }
  };

  return (
    <div className={`${styles.toast} ${styles[type]} ${show ? styles.show : styles.hide}`}>
      <Icon name={getIconName()} size={16} />
      <span className={styles.message}>{message}</span>
    </div>
  );
}

// Toast hook for easy usage
export function useToast() {
  const [toast, setToast] = useState<{ type: ToastType; message: string; visible: boolean }>({
    type: 'info',
    message: '',
    visible: false,
  });

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message, visible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return { toast, showToast, hideToast };
}
