'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import styles from '../venues/crud.module.css';

interface Member {
  id: number;
  name: string;
  phone: string;
  balance: number;
  createdAt: string;
}

export default function MembersPage() {
  const { token } = useAdminAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [token]);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/v1/admin/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        setMembers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (!selectedMember || !adjustAmount) return;
    try {
      const res = await fetch(`/api/v1/admin/members/${selectedMember.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(adjustAmount) }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('调整成功');
        setShowModal(false);
        fetchMembers();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Adjust failed:', error);
    }
  };

  const openModal = (member: Member) => {
    setSelectedMember(member);
    setAdjustAmount('');
    setShowModal(true);
  };

  if (loading) return <div className={styles.loading}>加载中...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>会员管理</h1>
      <div className={styles.list}>
        {members.map((member) => (
          <div key={member.id} className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.name}>{member.name}</div>
              <div className={styles.info}>手机: {member.phone}</div>
              <div className={styles.info}>余额: ¥{member.balance.toFixed(2)}</div>
              <div className={styles.info}>注册时间: {new Date(member.createdAt).toLocaleDateString()}</div>
            </div>
            <div className={styles.cardFooter}>
              <button className={styles.editBtn} onClick={() => openModal(member)}>调整余额</button>
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>调整余额 - {selectedMember?.name}</h2>
            <div className={styles.form}>
              <div className={styles.field}>
                <label>当前余额</label>
                <input value={`¥${selectedMember?.balance.toFixed(2)}`} disabled />
              </div>
              <div className={styles.field}>
                <label>调整金额(正数增加，负数减少)</label>
                <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="输入金额" />
              </div>
              <div className={styles.actions}>
                <button className={styles.saveBtn} onClick={handleAdjust}>确认</button>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
