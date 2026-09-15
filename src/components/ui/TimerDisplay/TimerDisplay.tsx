'use client';

import styles from './TimerDisplay.module.css';

export interface TimerDisplayProps {
  seconds: number;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function TimerDisplay({
  seconds,
  label = '已使用时长',
  size = 'medium',
  className = '',
}: TimerDisplayProps) {
  const formattedTime = formatTime(seconds);

  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      <span className={styles.value}>{formattedTime}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
