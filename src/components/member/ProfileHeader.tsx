'use client';

import styles from './ProfileHeader.module.css';

interface ProfileHeaderProps {
  avatar?: string;
  name: string;
  phone: string;
}

export default function ProfileHeader({ name, phone }: ProfileHeaderProps) {
  // 脱敏处理电话号码
  const maskedPhone = phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';

  return (
    <div className={styles.headerSection}>
      <div className={styles.avatar}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{name || '用户'}</span>
        <span className={styles.phone}>{maskedPhone}</span>
      </div>
    </div>
  );
}
