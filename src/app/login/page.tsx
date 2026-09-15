'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请输入姓名');
      return;
    }
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }
    if (!/^\d{11}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }

    setLoading(true);
    try {
      await login(phone, name);
      router.push('/member');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>欢迎使用</h1>
        <p className={styles.subtitle}>片场租赁计时管理系统</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="name">姓名</label>
          <input
            id="name"
            type="text"
            className={styles.input}
            placeholder="请输入姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="phone">手机号</label>
          <input
            id="phone"
            type="tel"
            className={styles.input}
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            maxLength={11}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className={styles.tip}>
        未注册的用户将自动创建账号
      </p>
    </div>
  );
}
