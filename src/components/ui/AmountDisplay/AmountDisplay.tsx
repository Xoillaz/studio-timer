'use client';

import styles from './AmountDisplay.module.css';

export interface AmountDisplayProps {
  label?: string;
  amount: number;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'success' | 'danger';
  className?: string;
}

export default function AmountDisplay({
  label,
  amount,
  size = 'medium',
  variant = 'primary',
  className = '',
}: AmountDisplayProps) {
  const formattedAmount = amount.toFixed(2);

  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={`${styles.value} ${styles[variant]}`}>
        ¥{formattedAmount}
      </span>
    </div>
  );
}
