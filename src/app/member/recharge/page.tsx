'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import styles from './recharge.module.css';

const RECHARGE_AMOUNTS = [100, 500, 1000];

export default function RechargePage() {
  const router = useRouter();
  const { member, recharge } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleRecharge = async () => {
    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || amount <= 0) {
      setError('请选择或输入充值金额');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await recharge(amount);
      setShowSuccess(true);
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '充值失败');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <Layout showFooter={false} showBack={true} onBack={() => router.back()}>
        <div className={styles.successContainer}>
          <div className={styles.successIcon}>✓</div>
          <p className={styles.successText}>充值成功</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false} showBack={true} onBack={() => router.back()}>
      <div className={styles.container}>
        {/* 当前余额 */}
        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>当前余额</span>
          <span className={styles.balanceValue}>¥{member?.balance.toFixed(2)}</span>
        </div>

        {/* 充值金额选择 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>选择充值金额</h3>
          <div className={styles.amountGrid}>
            {RECHARGE_AMOUNTS.map((amount) => (
              <button
                key={amount}
                className={`${styles.amountBtn} ${selectedAmount === amount ? styles.selected : ''}`}
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount('');
                }}
              >
                ¥{amount}
              </button>
            ))}
          </div>
        </div>

        {/* 自定义金额 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>自定义金额</h3>
          <div className={styles.customAmount}>
            <span className={styles.currency}>¥</span>
            <input
              type="number"
              className={styles.customInput}
              placeholder="请输入金额"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
            />
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* 充值按钮 */}
        <button
          className={styles.rechargeBtn}
          onClick={handleRecharge}
          disabled={loading || (!selectedAmount && !customAmount)}
        >
          {loading ? '充值中...' : '确认充值'}
        </button>
      </div>
    </Layout>
  );
}
