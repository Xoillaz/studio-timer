/**
 * M4 管理员端 - 资源管理模块测试
 * 对应测试用例: T4-8, T4-9
 * 
 * 测试目标：
 * - 场地管理 CRUD
 * - 增值服务管理 CRUD（v1.5 重构：原设备管理改为增值服务）
 * 
 * 更新记录：
 * - v1.5: 设备管理改为增值服务管理 (VasService)
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

interface VasService {
  id: number;
  name: string;
  price_per_use: number;
  category: 'equipment' | 'consumables';
  remark: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Mock Data Store
let venues: Venue[] = [
  { id: 1, name: '实景棚', price_per_hour: 200, description: '50平米实景棚', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 2, name: '绿幕棚', price_per_hour: 150, description: '30平米绿幕棚', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' }
];

let vasServices: VasService[] = [
  { id: 1, name: '专业摄影机', price_per_use: 100, category: 'equipment', remark: 'Sony FX6', is_active: true, sort_order: 1, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 2, name: '单反相机', price_per_use: 50, category: 'equipment', remark: 'Canon R5', is_active: true, sort_order: 2, created_at: '2026-01-01', updated_at: '2026-01-01' }
];

let venueIdCounter = 3;
let vasServiceIdCounter = 3;

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
  
  // VasService CRUD
  getVasServices: async (): Promise<VasService[]> => vasServices,
  getVasService: async (id: number): Promise<VasService | null> => vasServices.find(v => v.id === id) || null,
  createVasService: async (data: Omit<VasService, 'id' | 'created_at' | 'updated_at'>): Promise<VasService> => {
    const vasService: VasService = {
      id: vasServiceIdCounter++,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    vasServices.push(vasService);
    return vasService;
  },
  updateVasService: async (id: number, data: Partial<VasService>): Promise<VasService> => {
    const vasService = vasServices.find(v => v.id === id);
    if (!vasService) throw new Error('增值服务不存在');
    Object.assign(vasService, data, { updated_at: new Date().toISOString() });
    return vasService;
  },
  deleteVasService: async (id: number): Promise<void> => {
    const index = vasServices.findIndex(v => v.id === id);
    if (index === -1) throw new Error('增值服务不存在');
    vasServices.splice(index, 1);
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

// VasService Management Service
class VasServiceManagement {
  async getAll(): Promise<VasService[]> {
    return mockApi.getVasServices();
  }
  
  async getById(id: number): Promise<VasService | null> {
    return mockApi.getVasService(id);
  }
  
  async create(data: { 
    name: string; 
    price_per_use: number; 
    category?: 'equipment' | 'consumables';
    remark?: string; 
    is_active?: boolean;
    sort_order?: number;
  }): Promise<VasService> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('服务名称不能为空');
    }
    if (data.price_per_use < 0) {
      throw new Error('价格不能为负数');
    }
    return mockApi.createVasService({
      name: data.name,
      price_per_use: data.price_per_use,
      category: data.category || 'equipment',
      remark: data.remark || '',
      is_active: data.is_active !== undefined ? data.is_active : true,
      sort_order: data.sort_order || 0
    });
  }
  
  async update(id: number, data: Partial<{ 
    name: string; 
    price_per_use: number; 
    category: string;
    remark: string; 
    is_active: boolean;
    sort_order: number;
  }>): Promise<VasService> {
    if (data.price_per_use !== undefined && data.price_per_use < 0) {
      throw new Error('价格不能为负数');
    }
    return mockApi.updateVasService(id, data as Partial<VasService>);
  }
  
  async delete(id: number): Promise<void> {
    return mockApi.deleteVasService(id);
  }
  
  async toggleStatus(id: number): Promise<VasService> {
    const vasService = await this.getById(id);
    if (!vasService) throw new Error('增值服务不存在');
    return this.update(id, { is_active: !vasService.is_active });
  }
}

describe('M4 管理员端 - 资源管理', () => {
  let venueService: VenueService;
  let vasServiceManagement: VasServiceManagement;
  
  beforeEach(() => {
    venues = [
      { id: 1, name: '实景棚', price_per_hour: 200, description: '50平米实景棚', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 2, name: '绿幕棚', price_per_hour: 150, description: '30平米绿幕棚', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' }
    ];
    vasServices = [
      { id: 1, name: '专业摄影机', price_per_use: 100, category: 'equipment', remark: 'Sony FX6', is_active: true, sort_order: 1, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 2, name: '单反相机', price_per_use: 50, category: 'equipment', remark: 'Canon R5', is_active: true, sort_order: 2, created_at: '2026-01-01', updated_at: '2026-01-01' }
    ];
    venueIdCounter = 3;
    vasServiceIdCounter = 3;
    
    venueService = new VenueService();
    vasServiceManagement = new VasServiceManagement();
  });
  
  describe('T4-8: 场地管理 CRUD', () => {
    it('should create new venue', async () => {
      const venue = await venueService.create({
        name: '多功能棚',
        price_per_hour: 300,
        description: '100平米大型棚'
      });
      
      expect(venue).toBeDefined();
      expect(venue.name).toBe('多功能棚');
      expect(venue.price_per_hour).toBe(300);
      expect(venue.is_active).toBe(true);
    });
    
    it('should list all venues', async () => {
      const venues = await venueService.getAll();
      
      expect(venues.length).toBe(2);
    });
    
    it('should update venue price', async () => {
      const updated = await venueService.update(1, { price_per_hour: 250 });
      
      expect(updated.price_per_hour).toBe(250);
    });
    
    it('should delete venue', async () => {
      await venueService.delete(1);
      const venues = await venueService.getAll();
      
      expect(venues.length).toBe(1);
    });
    
    it('should toggle venue status', async () => {
      const toggled1 = await venueService.toggleStatus(1);
      expect(toggled1.is_active).toBe(false);
      
      const toggled2 = await venueService.toggleStatus(1);
      expect(toggled2.is_active).toBe(true);
    });
    
    it('should reject invalid venue name', async () => {
      await expect(venueService.create({
        name: '',
        price_per_hour: 50
      })).rejects.toThrow('场地名称不能为空');
    });
    
    it('should reject negative price', async () => {
      await expect(venueService.create({
        name: '测试场地',
        price_per_hour: -10
      })).rejects.toThrow('价格不能为负数');
    });
  });
  
  describe('T4-9: 增值服务管理 CRUD', () => {
    it('should create new vas service', async () => {
      const vasService = await vasServiceManagement.create({
        name: 'LED补光灯',
        price_per_use: 20,
        category: 'equipment',
        remark: 'Aputure 300d'
      });
      
      expect(vasService).toBeDefined();
      expect(vasService.name).toBe('LED补光灯');
      expect(vasService.price_per_use).toBe(20);
      expect(vasService.is_active).toBe(true);
    });
    
    it('should list all vas services', async () => {
      const vasServices = await vasServiceManagement.getAll();
      
      expect(vasServices.length).toBe(2);
    });
    
    it('should update vas service price', async () => {
      const updated = await vasServiceManagement.update(1, { price_per_use: 150 });
      
      expect(updated.price_per_use).toBe(150);
    });
    
    it('should delete vas service', async () => {
      await vasServiceManagement.delete(1);
      const vasServices = await vasServiceManagement.getAll();
      
      expect(vasServices.length).toBe(1);
    });
    
    it('should toggle vas service status', async () => {
      const toggled1 = await vasServiceManagement.toggleStatus(1);
      expect(toggled1.is_active).toBe(false);
      
      const toggled2 = await vasServiceManagement.toggleStatus(1);
      expect(toggled2.is_active).toBe(true);
    });
    
    it('should reject invalid vas service name', async () => {
      await expect(vasServiceManagement.create({
        name: '',
        price_per_use: 20
      })).rejects.toThrow('服务名称不能为空');
    });
    
    it('should reject negative price', async () => {
      await expect(vasServiceManagement.create({
        name: '测试服务',
        price_per_use: -5
      })).rejects.toThrow('价格不能为负数');
    });
  });
});
