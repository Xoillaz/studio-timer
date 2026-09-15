'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import styles from '../venues/crud.module.css';

interface Log {
  id: number;
  action: string;
  targetType: string;
  targetId: number;
  operatorId: number;
  details: string;
  createdAt: string;
}

export default function LogsPage() {
  const { token } = useAdminAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/v1/admin/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}>加载中...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>操作日志</h1>
      <div className={styles.list}>
        {logs.map((log) => (
          <div key={log.id} className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.name}>{log.action}</div>
              <div className={styles.info}>类型: {log.targetType}</div>
              <div className={styles.info}>详情: {log.details}</div>
              <div className={styles.info}>{new Date(log.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
