'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import styles from './crud.module.css';

interface Venue {
  id: number;
  name: string;
  pricePerHour: number;
  description: string;
  isActive: boolean;
}

export default function VenuesPage() {
  const { token } = useAdminAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [form, setForm] = useState({ name: '', pricePerHour: '', description: '', isActive: true });

  useEffect(() => {
    fetchVenues();
  }, [token]);

  const fetchVenues = async () => {
    try {
      const res = await fetch('/api/v1/venues');
      const data = await res.json();
      if (data.code === 0) {
        setVenues(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const url = editingVenue ? `/api/v1/venues/${editingVenue.id}` : '/api/v1/venues';
      const method = editingVenue ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, pricePerHour: parseFloat(form.pricePerHour) }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setShowModal(false);
        fetchVenues();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleToggle = async (venue: Venue) => {
    try {
      await fetch(`/api/v1/venues/${venue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !venue.isActive }),
      });
      fetchVenues();
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  const openModal = (venue?: Venue) => {
    if (venue) {
      setEditingVenue(venue);
      setForm({ name: venue.name, pricePerHour: String(venue.pricePerHour), description: venue.description, isActive: venue.isActive });
    } else {
      setEditingVenue(null);
      setForm({ name: '', pricePerHour: '', description: '', isActive: true });
    }
    setShowModal(true);
  };

  if (loading) return <div className={styles.loading}>加载中...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>场地管理</h1>
        <button className={styles.addBtn} onClick={() => openModal()}>+ 添加场地</button>
      </div>

      <div className={styles.list}>
        {venues.map((venue) => (
          <div key={venue.id} className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.name}>{venue.name}</div>
              <div className={styles.info}>¥{venue.pricePerHour}/小时</div>
              <div className={styles.info}>{venue.description}</div>
            </div>
            <div className={styles.cardFooter}>
              <label className={styles.switch}>
                <input type="checkbox" checked={venue.isActive} onChange={() => handleToggle(venue)} />
                <span className={styles.slider}></span>
              </label>
              <button className={styles.editBtn} onClick={() => openModal(venue)}>编辑</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>{editingVenue ? '编辑场地' : '添加场地'}</h2>
            <div className={styles.form}>
              <div className={styles.field}>
                <label>名称</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>单价(元/小时)</label>
                <input type="number" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>描述</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className={styles.actions}>
                <button className={styles.saveBtn} onClick={handleSave}>保存</button>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
