/**
 * M3 会话与计时 - SKU选择与会话模块测试
 * 对应测试用例: T3-1, T3-2, T3-3
 * 
 * 测试目标：
 * - SKU 选择与预计价格计算
 * - 余额不足时入场拦截
 * - 入场成功与订单创建
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

interface Equipment {
  id: number;
  name: string;
  price_per_use: number;
  description: string;
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

type OrderStatus = 
  | 'pending_entry' 
  | 'entering' 
  | 'partial_exit_pending' 
  | 'pending_exit' 
  | 'reviewing' 
  | 'topup_pending' 
  | 'rejected' 
  | 'completed';

interface Member {
  id: number;
  name: string;
  phone: string;
  balance: number;
}

interface OrderEquipment {
  id: number;
  order_id: number;
  equipment_id: number;
  quantity: number;
  subtotal: number;
}

// Mock Data Store
let venues: Venue[] = [
  { id: 1, name: '场地A', price_per_hour: 50, description: '50平米实景棚', is_active: true },
  { id: 2, name: '场地B', price_per_hour: 80, description: '30平米绿幕棚', is_active: true }
];

let equipments: Equipment[] = [
  { id: 1, name: '设备A', price_per_use: 20, description: 'Sony FX6', is_active: true },
  { id: 2, name: '设备B', price_per_use: 30, description: 'Canon R5', is_active: true }
];

let orders: Order[] = [];
let orderEquipments: OrderEquipment[] = [];
let orderIdCounter = 1;

// Mock API
const mockApi = {
  getVenues: async (): Promise<Venue[]> => venues.filter(v => v.is_active),
  getEquipments: async (): Promise<Equipment[]> => equipments.filter(e => e.is_active),
  
  createOrder: async (data: {
    member_id: number;
    venue_id: number;
    equipment_items: Array<{ equipment_id: number; quantity: number }>;
    leader_name?: string;
    leader_phone?: string;
  }): Promise<Order> => {
    const venue = venues.find(v => v.id === data.venue_id);
    if (!venue) throw new Error('场地不存在');
    
    // 计算基础费用（按小时，暂不计算设备）
    const base_amount = 0;
    
    const order: Order = {
      id: orderIdCounter++,
      order_no: `ORD${Date.now()}`,
      member_id: data.member_id,
      venue_id: data.venue_id,
      status: 'entering',
      entry_time: new Date().toISOString(),
      exit_time: null,
      duration_minutes: 0,
      base_amount,
      extra_amount: 0,
      final_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    orders.push(order);
    
    // 创建订单设备关联
    for (const item of data.equipment_items) {
      const equipment = equipments.find(e => e.id === item.equipment_id);
      if (equipment) {
        orderEquipments.push({
          id: orderEquipments.length + 1,
          order_id: order.id,
          equipment_id: item.equipment_id,
          quantity: item.quantity,
          subtotal: equipment.price_per_use * item.quantity
        });
        order.base_amount += equipment.price_per_use * item.quantity;
      }
    }
    
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
    const hours = durationMinutes / 60;
    const actualHours = Math.ceil(durationMinutes / 30) * 0.5; // 不足30分钟按30分钟计
    return Math.round(pricePerHour * actualHours * 100) / 100;
  }
  
  /**
   * 计算设备费用
   */
  static calculateEquipmentFee(equipmentItems: Array<{ price: number; quantity: number }>): number {
    return equipmentItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
  
  /**
   * 计算订单总费用
   */
  static calculateOrderFee(
    venue: Venue, 
    durationMinutes: number,
    orderEquipments: OrderEquipment[]
  ): number {
    const venueFee = this.calculateVenueFee(venue.price_per_hour, durationMinutes);
    const equipmentFee = orderEquipments.reduce((sum, oe) => {
      const equipment = equipments.find(e => e.id === oe.equipment_id);
      return sum + (equipment ? equipment.price_per_use * oe.quantity : 0);
    }, 0);
    return Math.round((venueFee + equipmentFee) * 100) / 100;
  }
}

// Session Service - 会话管理
class SessionService {
  private currentMember: Member;
  
  constructor(member: Member) {
    this.currentMember = member;
  }
  
  async getSKUSelection(): Promise<{ venues: Venue[]; equipments: Equipment[] }> {
    const venues = await mockApi.getVenues();
    const equipments = await mockApi.getEquipments();
    return { venues, equipments };
  }
  
  /**
   * 计算预计价格
   * T3-1: 预计5小时价格 = 50×5 + 20×1 = ¥270.00
   */
  calculateEstimatedPrice(
    venue: Venue, 
    equipmentItems: Array<{ equipment: Equipment; quantity: number }>,
    estimatedHours: number
  ): number {
    const venueFee = venue.price_per_hour * estimatedHours;
    const equipmentFee = equipmentItems.reduce(
      (sum, item) => sum + item.equipment.price_per_use * item.quantity, 
      0
    );
    return Math.round((venueFee + equipmentFee) * 100) / 100;
  }
  
  /**
   * 校验余额是否足够入场
   * T3-2: 余额不足时入场拦截
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
   * 申请入场
   * T3-3: 入场成功与订单创建
   */
  async entry(
    venueId: number, 
    equipmentItems: Array<{ equipment_id: number; quantity: number }>
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    const venue = venues.find(v => v.id === venueId);
    if (!venue) return { success: false, error: '场地不存在' };
    
    // 估算入场费用（按1小时计算）
    const estimatedPrice = this.calculateEstimatedPrice(
      venue, 
      equipmentItems.map(e => ({ 
        equipment: equipments.find(eq => eq.id === e.equipment_id)!, 
        quantity: e.quantity 
      })), 
      1
    );
    
    // 检查余额
    const balanceCheck = this.checkBalanceForEntry(estimatedPrice);
    if (!balanceCheck.sufficient) {
      return { 
        success: false, 
        error: `余额不足，需要充值 ¥${balanceCheck.deficit.toFixed(2)} 才能继续` 
      };
    }
    
    // 创建订单
    const order = await mockApi.createOrder({
      member_id: this.currentMember.id,
      venue_id: venueId,
      equipment_items: equipmentItems
    });
    
    return { success: true, order };
  }
}

describe('M3 会话与计时 - SKU选择与会话', () => {
  let sessionService: SessionService;
  const testMember: Member = { id: 1, name: '张三', phone: '13800138000', balance: 500 };
  
  beforeEach(() => {
    orders = [];
    orderEquipments = [];
    orderIdCounter = 1;
    sessionService = new SessionService(testMember);
  });
  
  describe('T3-1: SKU 选择与预计价格计算', () => {
    it('should calculate estimated price correctly', async () => {
      // Arrange
      const venue = venues[0]; // 场地A ¥50/h
      const equipment = equipments[0]; // 设备A ¥20/次
      const equipmentItems = [{ equipment, quantity: 1 }];
      const estimatedHours = 5;
      
      // Act
      const price = sessionService.calculateEstimatedPrice(venue, equipmentItems, estimatedHours);
      
      // Assert - 预计5小时价格 = 50×5 + 20×1 = ¥270.00
      expect(price).toBe(270);
    });
    
    it('should calculate price with multiple equipments', async () => {
      // Arrange
      const venue = venues[0]; // ¥50/h
      const equipmentA = equipments[0]; // ¥20/次
      const equipmentB = equipments[1]; // ¥30/次
      const equipmentItems = [
        { equipment: equipmentA, quantity: 2 },
        { equipment: equipmentB, quantity: 1 }
      ];
      const estimatedHours = 3;
      
      // Act
      const price = sessionService.calculateEstimatedPrice(venue, equipmentItems, estimatedHours);
      
      // Assert - 50×3 + 20×2 + 30×1 = 150 + 40 + 30 = ¥220
      expect(price).toBe(220);
    });
    
    it('should get active venues and equipments', async () => {
      // Act
      const { venues: activeVenues, equipments: activeEquipments } = await sessionService.getSKUSelection();
      
      // Assert
      expect(activeVenues.length).toBe(2);
      expect(activeEquipments.length).toBe(2);
    });
  });
  
  describe('T3-2: 余额不足时入场拦截', () => {
    it('should block entry when balance is insufficient', async () => {
      // Arrange - 余额 0 的会员
      const poorMember: Member = { id: 2, name: '李四', phone: '13800138001', balance: 0 };
      const poorSession = new SessionService(poorMember);
      const venue = venues[0]; // ¥50/h
      const equipmentItems: Array<{ equipment_id: number; quantity: number }> = [];
      
      // Act
      const result = await poorSession.entry(venue.id, equipmentItems);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('余额不足');
    });
    
    it('should show required amount in error message', async () => {
      // Arrange
      const poorMember: Member = { id: 2, name: '李四', phone: '13800138001', balance: 0 };
      const poorSession = new SessionService(poorMember);
      const venue = venues[0];
      const equipmentItems: Array<{ equipment_id: number; quantity: number }> = [];
      
      // Act
      const result = await poorSession.entry(venue.id, equipmentItems);
      
      // Assert - 需要充值至少¥50（按1小时估算）
      expect(result.error).toContain('¥');
    });
  });
  
  describe('T3-3: 入场成功与订单创建', () => {
    it('should create order with entering status', async () => {
      // Arrange
      const venue = venues[0];
      const equipmentItems: Array<{ equipment_id: number; quantity: number }> = [
        { equipment_id: 1, quantity: 1 }
      ];
      
      // Act
      const result = await sessionService.entry(venue.id, equipmentItems);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order!.status).toBe('entering');
      expect(result.order!.entry_time).toBeTruthy();
    });
    
    it('should record entry time', async () => {
      // Arrange
      const venue = venues[0];
      const equipmentItems: Array<{ equipment_id: number; quantity: number }> = [];
      const beforeEntry = new Date();
      
      // Act
      const result = await sessionService.entry(venue.id, equipmentItems);
      const afterEntry = new Date();
      
      // Assert
      const entryTime = new Date(result.order!.entry_time!);
      expect(entryTime.getTime()).toBeGreaterThanOrEqual(beforeEntry.getTime());
      expect(entryTime.getTime()).toBeLessThanOrEqual(afterEntry.getTime());
    });
    
    it('should create order with equipment items', async () => {
      // Arrange
      const venue = venues[0];
      const equipmentItems: Array<{ equipment_id: number; quantity: number }> = [
        { equipment_id: 1, quantity: 2 },
        { equipment_id: 2, quantity: 1 }
      ];
      
      // Act
      const result = await sessionService.entry(venue.id, equipmentItems);
      
      // Assert - 验证订单设备关联已创建
      expect(result.success).toBe(true);
      // 订单基础费用应包含设备费用: 20*2 + 30*1 = 70
      expect(result.order!.base_amount).toBe(70);
    });
  });
  
  describe('计费规则测试', () => {
    it('should calculate venue fee by minute - under 30 min', () => {
      // 不足30分钟按30分钟计
      const fee = BillingService.calculateVenueFee(50, 20); // 20分钟
      expect(fee).toBe(25); // ¥50 * 0.5 = ¥25
    });
    
    it('should calculate venue fee by minute - exactly 30 min', () => {
      const fee = BillingService.calculateVenueFee(50, 30);
      expect(fee).toBe(25);
    });
    
    it('should calculate venue fee by minute - over 30 min', () => {
      const fee = BillingService.calculateVenueFee(50, 45); // 45分钟 = 1小时
      expect(fee).toBe(50);
    });
    
    it('should calculate venue fee by minute - 2.5 hours', () => {
      // 150分钟 = 5个30分钟单元 = 2.5小时 = ¥50 × 2.5 = ¥125
      const fee = BillingService.calculateVenueFee(50, 150);
      expect(fee).toBe(125);
    });
    
    it('should calculate equipment fee', () => {
      const fee = BillingService.calculateEquipmentFee([
        { price: 20, quantity: 2 },
        { price: 30, quantity: 1 }
      ]);
      expect(fee).toBe(70);
    });
  });
});
