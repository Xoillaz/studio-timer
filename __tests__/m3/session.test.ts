/**
 * M3 会话与计时 - SKU选择与会话模块测试
 * 对应测试用例: T3-1, T3-2, T3-3
 * 
 * 测试目标：
 * - SKU 选择与预计价格计算
 * - 余额不足时入场拦截
 * - 入场成功与订单创建
 * 
 * 更新记录：
 * - v1.5: 重构后使用 VasService (增值服务)，订单状态简化为 pending → active → completed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types
interface Venue {
  id: number;
  name: string;
  price_per_hour: number;
  description: string;
  is_active: boolean;
}

interface VasService {
  id: number;
  name: string;
  price_per_use: number;
  category: 'equipment' | 'consumables';
  remark: string;
  is_active: boolean;
}

interface Order {
  id: number;
  order_no: string;
  member_id: number;
  venue_id: number;
  status: OrderStatus;
  entry_time: string | null;
  exit_time: string | null;
  duration_minutes: number;
  base_amount: number;
  extra_amount: number;
  final_amount: number;
  created_at: string;
  updated_at: string;
}

type OrderStatus = 'pending' | 'active' | 'completed';

interface Member {
  id: number;
  name: string;
  phone: string;
  balance: number;
}

interface OrderVasService {
  id: number;
  order_id: number;
  vas_service_id: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

// Mock Data Store
let venues: Venue[] = [
  { id: 1, name: '实景棚', price_per_hour: 200, description: '50平米实景棚', is_active: true },
  { id: 2, name: '绿幕棚', price_per_hour: 150, description: '30平米绿幕棚', is_active: true }
];

let vasServices: VasService[] = [
  { id: 1, name: '专业摄影机', price_per_use: 100, category: 'equipment', remark: 'Sony FX6', is_active: true },
  { id: 2, name: '单反相机', price_per_use: 50, category: 'equipment', remark: 'Canon R5', is_active: true },
  { id: 3, name: 'LED补光灯', price_per_use: 20, category: 'equipment', remark: 'Aputure 300d', is_active: true }
];

let orders: Order[] = [];
let orderVasServices: OrderVasService[] = [];
let orderIdCounter = 1;

// Mock API
const mockApi = {
  getVenues: async (): Promise<Venue[]> => venues.filter(v => v.is_active),
  getVasServices: async (): Promise<VasService[]> => vasServices.filter(v => v.is_active),
  
  createOrder: async (data: {
    member_id: number;
    venue_id: number;
  }): Promise<Order> => {
    const venue = venues.find(v => v.id === data.venue_id);
    if (!venue) throw new Error('场地不存在');
    
    const order: Order = {
      id: orderIdCounter++,
      order_no: `ORD${Date.now()}`,
      member_id: data.member_id,
      venue_id: data.venue_id,
      status: 'pending',
      entry_time: null,
      exit_time: null,
      duration_minutes: 0,
      base_amount: 0,
      extra_amount: 0,
      final_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    orders.push(order);
    return order;
  },
  
  entry: async (orderId: number): Promise<Order> => {
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('订单不存在');
    if (order.status !== 'pending') throw new Error('订单状态不允许此操作');
    
    order.status = 'active';
    order.entry_time = new Date().toISOString();
    order.updated_at = new Date().toISOString();
    
    return order;
  },
  
  getOrder: async (id: number): Promise<Order | null> => {
    return orders.find(o => o.id === id) || null;
  }
};

// Billing Service - 计费逻辑
class BillingService {
  /**
   * 计算场地费用
   * 规则：按分钟计费，不足30分钟按30分钟计
   */
  static calculateVenueFee(pricePerHour: number, durationMinutes: number): number {
    if (durationMinutes <= 0) return 0;
    const billableMinutes = Math.ceil(durationMinutes / 30) * 30;
    const hours = billableMinutes / 60;
    return Math.round(pricePerHour * hours * 100) / 100;
  }
  
  /**
   * 计算增值服务费用
   */
  static calculateVasFee(vasItems: Array<{ price: number; quantity: number }>): number {
    return vasItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
  
  /**
   * 计算订单总费用
   */
  static calculateOrderFee(
    venue: Venue, 
    durationMinutes: number,
    orderVasServices: OrderVasService[]
  ): number {
    const venueFee = this.calculateVenueFee(venue.price_per_hour, durationMinutes);
    const vasFee = orderVasServices.reduce((sum, ovs) => {
      const vas = vasServices.find(v => v.id === ovs.vas_service_id);
      return sum + (vas ? vas.price_per_use * ovs.quantity : 0);
    }, 0);
    return Math.round((venueFee + vasFee) * 100) / 100;
  }
}

// Session Service - 会话管理
class SessionService {
  private currentMember: Member;
  
  constructor(member: Member) {
    this.currentMember = member;
  }
  
  async getSKUSelection(): Promise<{ venues: Venue[]; vasServices: VasService[] }> {
    const venues = await mockApi.getVenues();
    const vasServices = await mockApi.getVasServices();
    return { venues, vasServices };
  }
  
  /**
   * 计算预计价格
   */
  calculateEstimatedPrice(
    venue: Venue, 
    vasItems: Array<{ vasService: VasService; quantity: number }>,
    estimatedHours: number
  ): number {
    const venueFee = venue.price_per_hour * estimatedHours;
    const vasFee = vasItems.reduce(
      (sum, item) => sum + item.vasService.price_per_use * item.quantity, 
      0
    );
    return Math.round((venueFee + vasFee) * 100) / 100;
  }
  
  /**
   * 校验余额是否足够入场
   */
  checkBalanceForEntry(estimatedPrice: number): { sufficient: boolean; required: number; deficit: number } {
    const deficit = Math.max(0, estimatedPrice - this.currentMember.balance);
    return {
      sufficient: this.currentMember.balance >= estimatedPrice,
      required: estimatedPrice,
      deficit
    };
  }
  
  /**
   * 创建订单（选择场地，待入场）
   */
  async createOrder(venueId: number): Promise<{ success: boolean; order?: Order; error?: string }> {
    const venue = venues.find(v => v.id === venueId);
    if (!venue) return { success: false, error: '场地不存在' };
    
    // 估算入场费用（按1小时计算）
    const estimatedPrice = venue.price_per_hour * 1;
    
    // 检查余额
    const balanceCheck = this.checkBalanceForEntry(estimatedPrice);
    if (!balanceCheck.sufficient) {
      return { 
        success: false, 
        error: `余额不足，需要充值 ¥${balanceCheck.deficit.toFixed(2)} 才能继续` 
      };
    }
    
    const order = await mockApi.createOrder({
      member_id: this.currentMember.id,
      venue_id: venueId
    });
    
    return { success: true, order };
  }
  
  /**
   * 入场（开始计时）
   */
  async entry(orderId: number): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const order = await mockApi.entry(orderId);
      return { success: true, order };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

describe('M3 会话与计时 - SKU选择与会话', () => {
  let sessionService: SessionService;
  const testMember: Member = { id: 1, name: '张三', phone: '13800138000', balance: 500 };
  
  beforeEach(() => {
    orders = [];
    orderVasServices = [];
    orderIdCounter = 1;
    sessionService = new SessionService(testMember);
  });
  
  describe('T3-1: SKU 选择与预计价格计算', () => {
    it('should calculate estimated price correctly', async () => {
      const venue = venues[0]; // 实景棚 ¥200/h
      const vasService = vasServices[0]; // 专业摄影机 ¥100/次
      const vasItems = [{ vasService, quantity: 1 }];
      const estimatedHours = 5;
      
      const price = sessionService.calculateEstimatedPrice(venue, vasItems, estimatedHours);
      
      // 预计5小时价格 = 200×5 + 100×1 = ¥1100
      expect(price).toBe(1100);
    });
    
    it('should calculate price with multiple vas services', async () => {
      const venue = venues[0]; // ¥200/h
      const vasA = vasServices[0]; // ¥100/次
      const vasB = vasServices[2]; // ¥20/次
      const vasItems = [
        { vasService: vasA, quantity: 2 },
        { vasService: vasB, quantity: 1 }
      ];
      const estimatedHours = 3;
      
      const price = sessionService.calculateEstimatedPrice(venue, vasItems, estimatedHours);
      
      // 200×3 + 100×2 + 20×1 = 600 + 200 + 20 = ¥820
      expect(price).toBe(820);
    });
    
    it('should get active venues and vas services', async () => {
      const { venues: activeVenues, vasServices: activeVasServices } = await sessionService.getSKUSelection();
      
      expect(activeVenues.length).toBe(2);
      expect(activeVasServices.length).toBe(3);
    });
  });
  
  describe('T3-2: 余额不足时入场拦截', () => {
    it('should block entry when balance is insufficient', async () => {
      const poorMember: Member = { id: 2, name: '李四', phone: '13800138001', balance: 0 };
      const poorSession = new SessionService(poorMember);
      const venue = venues[0]; // ¥200/h
      
      const result = await poorSession.createOrder(venue.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('余额不足');
    });
    
    it('should show required amount in error message', async () => {
      const poorMember: Member = { id: 2, name: '李四', phone: '13800138001', balance: 0 };
      const poorSession = new SessionService(poorMember);
      const venue = venues[0];
      
      const result = await poorSession.createOrder(venue.id);
      
      expect(result.error).toContain('¥');
    });
  });
  
  describe('T3-3: 入场成功与订单创建', () => {
    it('should create order with pending status', async () => {
      const venue = venues[0];
      
      const result = await sessionService.createOrder(venue.id);
      
      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order!.status).toBe('pending');
    });
    
    it('should entry successfully and change status to active', async () => {
      const venue = venues[0];
      const createResult = await sessionService.createOrder(venue.id);
      
      const entryResult = await sessionService.entry(createResult.order!.id);
      
      expect(entryResult.success).toBe(true);
      expect(entryResult.order!.status).toBe('active');
      expect(entryResult.order!.entry_time).toBeTruthy();
    });
    
    it('should record entry time', async () => {
      const venue = venues[0];
      const createResult = await sessionService.createOrder(venue.id);
      const beforeEntry = new Date();
      
      const entryResult = await sessionService.entry(createResult.order!.id);
      const afterEntry = new Date();
      
      const entryTime = new Date(entryResult.order!.entry_time!);
      expect(entryTime.getTime()).toBeGreaterThanOrEqual(beforeEntry.getTime());
      expect(entryTime.getTime()).toBeLessThanOrEqual(afterEntry.getTime());
    });
  });
  
  describe('计费规则测试', () => {
    it('should calculate venue fee by minute - under 30 min', () => {
      const fee = BillingService.calculateVenueFee(200, 20);
      expect(fee).toBe(100); // ¥200/小时 ÷ 2 = ¥100/半小时 * 1单元 = ¥100
    });
    
    it('should calculate venue fee by minute - exactly 30 min', () => {
      const fee = BillingService.calculateVenueFee(200, 30);
      expect(fee).toBe(100); // ¥200/小时 ÷ 2 = ¥100/半小时 * 1单元 = ¥100
    });
    
    it('should calculate venue fee by minute - over 30 min', () => {
      const fee = BillingService.calculateVenueFee(200, 45);
      expect(fee).toBe(200); // ¥200/小时 ÷ 2 = ¥100/半小时 * 2单元 = ¥200
    });
    
    it('should calculate vas service fee', () => {
      const fee = BillingService.calculateVasFee([
        { price: 100, quantity: 2 },
        { price: 20, quantity: 3 }
      ]);
      expect(fee).toBe(260);
    });
  });
});
