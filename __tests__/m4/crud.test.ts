/**
 * M4 管理员端 - 资源管理模块测试
 * 对应测试用例: T4-8, T4-9
 * 
 * 测试目标：
 * - 场地管理 CRUD
 * - 设备管理 CRUD
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types
interface Venue {
  id: number;
  name: string;
  price_per_hour: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Equipment {
  id: number;
  name: string;
  price_per_use: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Mock Data Store
let venues: Venue[] = [
  { id: 1, name: '场地A', price_per_hour: 50, description: '50平米实景棚', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 2, name: '场地B', price_per_hour: 80, description: '30平米绿幕棚', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' }
];

let equipments: Equipment[] = [
  { id: 1, name: '设备A', price_per_use: 20, description: 'Sony FX6', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 2, name: '设备B', price_per_use: 30, description: 'Canon R5', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' }
];

let venueIdCounter = 3;
let equipmentIdCounter = 3;

// Mock API
const mockApi = {
  // Venue CRUD
  getVenues: async (): Promise<Venue[]> => venues,
  getVenue: async (id: number): Promise<Venue | null> => venues.find(v => v.id === id) || null,
  createVenue: async (data: Omit<Venue, 'id' | 'created_at' | 'updated_at'>): Promise<Venue> => {
    const venue: Venue = {
      id: venueIdCounter++,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    venues.push(venue);
    return venue;
  },
  updateVenue: async (id: number, data: Partial<Venue>): Promise<Venue> => {
    const venue = venues.find(v => v.id === id);
    if (!venue) throw new Error('场地不存在');
    Object.assign(venue, data, { updated_at: new Date().toISOString() });
    return venue;
  },
  deleteVenue: async (id: number): Promise<void> => {
    const index = venues.findIndex(v => v.id === id);
    if (index === -1) throw new Error('场地不存在');
    venues.splice(index, 1);
  },
  
  // Equipment CRUD
  getEquipments: async (): Promise<Equipment[]> => equipments,
  getEquipment: async (id: number): Promise<Equipment | null> => equipments.find(e => e.id === id) || null,
  createEquipment: async (data: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>): Promise<Equipment> => {
    const equipment: Equipment = {
      id: equipmentIdCounter++,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    equipments.push(equipment);
    return equipment;
  },
  updateEquipment: async (id: number, data: Partial<Equipment>): Promise<Equipment> => {
    const equipment = equipments.find(e => e.id === id);
    if (!equipment) throw new Error('设备不存在');
    Object.assign(equipment, data, { updated_at: new Date().toISOString() });
    return equipment;
  },
  deleteEquipment: async (id: number): Promise<void> => {
    const index = equipments.findIndex(e => e.id === id);
    if (index === -1) throw new Error('设备不存在');
    equipments.splice(index, 1);
  }
};

// Venue Management Service
class VenueService {
  async getAll(): Promise<Venue[]> {
    return mockApi.getVenues();
  }
  
  async getById(id: number): Promise<Venue | null> {
    return mockApi.getVenue(id);
  }
  
  async create(data: { name: string; price_per_hour: number; description?: string; is_active?: boolean }): Promise<Venue> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('场地名称不能为空');
    }
    if (data.price_per_hour < 0) {
      throw new Error('价格不能为负数');
    }
    return mockApi.createVenue({
      name: data.name,
      price_per_hour: data.price_per_hour,
      description: data.description || '',
      is_active: data.is_active !== undefined ? data.is_active : true
    });
  }
  
  async update(id: number, data: Partial<{ name: string; price_per_hour: number; description: string; is_active: boolean }>): Promise<Venue> {
    if (data.price_per_hour !== undefined && data.price_per_hour < 0) {
      throw new Error('价格不能为负数');
    }
    return mockApi.updateVenue(id, data as Partial<Venue>);
  }
  
  async delete(id: number): Promise<void> {
    return mockApi.deleteVenue(id);
  }
  
  async toggleStatus(id: number): Promise<Venue> {
    const venue = await this.getById(id);
    if (!venue) throw new Error('场地不存在');
    return this.update(id, { is_active: !venue.is_active });
  }
}

// Equipment Management Service
class EquipmentService {
  async getAll(): Promise<Equipment[]> {
    return mockApi.getEquipments();
  }
  
  async getById(id: number): Promise<Equipment | null> {
    return mockApi.getEquipment(id);
  }
  
  async create(data: { name: string; price_per_use: number; description?: string; is_active?: boolean }): Promise<Equipment> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('设备名称不能为空');
    }
    if (data.price_per_use < 0) {
      throw new Error('价格不能为负数');
    }
    return mockApi.createEquipment({
      name: data.name,
      price_per_use: data.price_per_use,
      description: data.description || '',
      is_active: data.is_active !== undefined ? data.is_active : true
    });
  }
  
  async update(id: number, data: Partial<{ name: string; price_per_use: number; description: string; is_active: boolean }>): Promise<Equipment> {
    if (data.price_per_use !== undefined && data.price_per_use < 0) {
      throw new Error('价格不能为负数');
    }
    return mockApi.updateEquipment(id, data as Partial<Equipment>);
  }
  
  async delete(id: number): Promise<void> {
    return mockApi.deleteEquipment(id);
  }
  
  async toggleStatus(id: number): Promise<Equipment> {
    const equipment = await this.getById(id);
    if (!equipment) throw new Error('设备不存在');
    return this.update(id, { is_active: !equipment.is_active });
  }
}

describe('M4 管理员端 - 资源管理', () => {
  let venueService: VenueService;
  let equipmentService: EquipmentService;
  
  beforeEach(() => {
    // 重置数据
    venues = [
      { id: 1, name: '场地A', price_per_hour: 50, description: '50平米实景棚', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 2, name: '场地B', price_per_hour: 80, description: '30平米绿幕棚', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' }
    ];
    equipments = [
      { id: 1, name: '设备A', price_per_use: 20, description: 'Sony FX6', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 2, name: '设备B', price_per_use: 30, description: 'Canon R5', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' }
    ];
    venueIdCounter = 3;
    equipmentIdCounter = 3;
    
    venueService = new VenueService();
    equipmentService = new EquipmentService();
  });
  
  describe('T4-8: 场地管理 CRUD', () => {
    it('should create new venue', async () => {
      // Act
      const venue = await venueService.create({
        name: '棚B',
        price_per_hour: 80,
        description: '新场地'
      });
      
      // Assert
      expect(venue).toBeDefined();
      expect(venue.name).toBe('棚B');
      expect(venue.price_per_hour).toBe(80);
      expect(venue.is_active).toBe(true);
    });
    
    it('should list all venues', async () => {
      // Act
      const venues = await venueService.getAll();
      
      // Assert
      expect(venues.length).toBe(2);
    });
    
    it('should update venue price', async () => {
      // Arrange
      const venueId = 1;
      
      // Act
      const updated = await venueService.update(venueId, { price_per_hour: 100 });
      
      // Assert
      expect(updated.price_per_hour).toBe(100);
    });
    
    it('should delete venue', async () => {
      // Arrange
      const venueId = 1;
      
      // Act
      await venueService.delete(venueId);
      const venues = await venueService.getAll();
      
      // Assert
      expect(venues.length).toBe(1);
      expect(venues.find(v => v.id === venueId)).toBeUndefined();
    });
    
    it('should toggle venue status', async () => {
      // Arrange
      const venueId = 1;
      
      // Act - 启用 -> 禁用
      const toggled1 = await venueService.toggleStatus(venueId);
      expect(toggled1.is_active).toBe(false);
      
      // Act - 禁用 -> 启用
      const toggled2 = await venueService.toggleStatus(venueId);
      expect(toggled2.is_active).toBe(true);
    });
    
    it('should reject invalid venue name', async () => {
      // Act & Assert
      await expect(venueService.create({
        name: '',
        price_per_hour: 50
      })).rejects.toThrow('场地名称不能为空');
    });
    
    it('should reject negative price', async () => {
      // Act & Assert
      await expect(venueService.create({
        name: '测试场地',
        price_per_hour: -10
      })).rejects.toThrow('价格不能为负数');
    });
  });
  
  describe('T4-9: 设备管理 CRUD', () => {
    it('should create new equipment', async () => {
      // Act
      const equipment = await equipmentService.create({
        name: '灯光设备',
        price_per_use: 30,
        description: 'Aputure 300d'
      });
      
      // Assert
      expect(equipment).toBeDefined();
      expect(equipment.name).toBe('灯光设备');
      expect(equipment.price_per_use).toBe(30);
      expect(equipment.is_active).toBe(true);
    });
    
    it('should list all equipments', async () => {
      // Act
      const equipments = await equipmentService.getAll();
      
      // Assert
      expect(equipments.length).toBe(2);
    });
    
    it('should update equipment price', async () => {
      // Arrange
      const equipmentId = 1;
      
      // Act
      const updated = await equipmentService.update(equipmentId, { price_per_use: 50 });
      
      // Assert
      expect(updated.price_per_use).toBe(50);
    });
    
    it('should delete equipment', async () => {
      // Arrange
      const equipmentId = 1;
      
      // Act
      await equipmentService.delete(equipmentId);
      const equipments = await equipmentService.getAll();
      
      // Assert
      expect(equipments.length).toBe(1);
      expect(equipments.find(e => e.id === equipmentId)).toBeUndefined();
    });
    
    it('should toggle equipment status', async () => {
      // Arrange
      const equipmentId = 1;
      
      // Act - 启用 -> 禁用
      const toggled1 = await equipmentService.toggleStatus(equipmentId);
      expect(toggled1.is_active).toBe(false);
      
      // Act - 禁用 -> 启用
      const toggled2 = await equipmentService.toggleStatus(equipmentId);
      expect(toggled2.is_active).toBe(true);
    });
    
    it('should reject invalid equipment name', async () => {
      // Act & Assert
      await expect(equipmentService.create({
        name: '',
        price_per_use: 20
      })).rejects.toThrow('设备名称不能为空');
    });
    
    it('should reject negative price', async () => {
      // Act & Assert
      await expect(equipmentService.create({
        name: '测试设备',
        price_per_use: -5
      })).rejects.toThrow('价格不能为负数');
    });
  });
});
