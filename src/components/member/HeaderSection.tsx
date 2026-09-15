'use client';

import { useRouter } from 'next/navigation';
import styles from './HeaderSection.module.css';

interface HeaderSectionProps {
  balance: number;
}

export default function HeaderSection({ balance }: HeaderSectionProps) {
  const router = useRouter();

  return (
    <div className={styles.headerSection}>
      <div className={styles.balanceInfo}>
        <span className={styles.balanceLabel}>账户余额</span>
        <span className={styles.balanceValue}>¥{balance.toFixed(2)}</span>
      </div>
      <button 
        className={styles.rechargeBtn}
        onClick={() => router.push('/member/recharge')}
      >
        充值
      </button>
    </div>
  );
}
