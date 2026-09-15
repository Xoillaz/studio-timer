'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import styles from '../venues/crud.module.css';

interface Equipment {
  id: number;
  name: string;
  pricePerUse: number;
  description: string;
  isActive: boolean;
}

export default function EquipmentsPage() {
  const { token } = useAdminAuth();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [form, setForm] = useState({ name: '', pricePerUse: '', description: '', isActive: true });

  useEffect(() => {
    fetchEquipments();
  }, [token]);

  const fetchEquipments = async () => {
    try {
      const res = await fetch('/api/v1/equipments');
      const data = await res.json();
      if (data.code === 0) {
        setEquipments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch equipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const url = editingEquipment ? `/api/v1/equipments/${editingEquipment.id}` : '/api/v1/equipments';
      const method = editingEquipment ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, pricePerUse: parseFloat(form.pricePerUse) }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setShowModal(false);
        fetchEquipments();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleToggle = async (equipment: Equipment) => {
    try {
      await fetch(`/api/v1/equipments/${equipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !equipment.isActive }),
      });
      fetchEquipments();
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  const openModal = (equipment?: Equipment) => {
    if (equipment) {
      setEditingEquipment(equipment);
      setForm({ name: equipment.name, pricePerUse: String(equipment.pricePerUse), description: equipment.description, isActive: equipment.isActive });
    } else {
      setEditingEquipment(null);
      setForm({ name: '', pricePerUse: '', description: '', isActive: true });
    }
    setShowModal(true);
  };

  if (loading) return <div className={styles.loading}>加载中...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>设备管理</h1>
        <button className={styles.addBtn} onClick={() => openModal()}>+ 添加设备</button>
      </div>

      <div className={styles.list}>
        {equipments.map((equipment) => (
          <div key={equipment.id} className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.name}>{equipment.name}</div>
              <div className={styles.info}>¥{equipment.pricePerUse}/次</div>
              <div className={styles.info}>{equipment.description}</div>
            </div>
            <div className={styles.cardFooter}>
              <label className={styles.switch}>
                <input type="checkbox" checked={equipment.isActive} onChange={() => handleToggle(equipment)} />
                <span className={styles.slider}></span>
              </label>
              <button className={styles.editBtn} onClick={() => openModal(equipment)}>编辑</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>{editingEquipment ? '编辑设备' : '添加设备'}</h2>
            <div className={styles.form}>
              <div className={styles.field}>
                <label>名称</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>单价(元/次)</label>
                <input type="number" value={form.pricePerUse} onChange={(e) => setForm({ ...form, pricePerUse: e.target.value })} />
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
