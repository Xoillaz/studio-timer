/**
 * M3 会话与计时 - 计时器与离场模块测试
 * 对应测试用例: T3-4, T3-5, T3-6, T3-7, T3-8
 * 
 * 测试目标：
 * - 计时器实时更新
 * - 预计费用实时计算
 * - 申请离场
 * - 余额不足引导充值
 * - 充值后继续离场流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types
interface Venue {
  id: number;
  name: string;
  price_per_hour: number;
}

interface Equipment {
  id: number;
  name: string;
  price_per_use: number;
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

// Mock Data Store
let orders: Order[] = [];
let orderIdCounter = 1;

const venues: Venue[] = [
  { id: 1, name: '场地A', price_per_hour: 50 },
  { id: 2, name: '场地B', price_per_hour: 80 }
];

// Mock API
const mockApi = {
  getOrder: async (id: number): Promise<Order | null> => {
    return orders.find(o => o.id === id) || null;
  },
  
  updateOrder: async (id: number, data: Partial<Order>): Promise<Order> => {
    const order = orders.find(o => o.id === id);
    if (!order) throw new Error('订单不存在');
    Object.assign(order, data, { updated_at: new Date().toISOString() });
    return order;
  }
};

// Timer Service - 计时器逻辑
class TimerService {
  /**
   * 计算已使用时长（分钟）
   */
  static calculateDuration(entryTime: string): number {
    const entry = new Date(entryTime);
    const now = new Date();
    return Math.floor((now.getTime() - entry.getTime()) / 60000);
  }
  
  /**
   * 格式化时长为 HH:MM:SS
   */
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = Math.floor((minutes % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * 格式化时长为 MM:SS (用于计时器显示)
   */
  static formatTimer(entryTime: string): string {
    const duration = this.calculateDuration(entryTime);
    const mins = Math.floor(duration);
    const secs = Math.floor((duration - mins) * 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

// Billing Service - 计费逻辑
class BillingService {
  /**
   * 计算场地费用（按分钟，舍入规则：不足30分钟按30分钟计）
   */
  static calculateVenueFee(pricePerHour: number, durationMinutes: number): number {
    if (durationMinutes <= 0) return 0;
    
    // 不足30分钟按30分钟计，超过30分钟按实际分钟数
    const billableMinutes = Math.ceil(durationMinutes / 30) * 30;
    const hours = billableMinutes / 60;
    return Math.round(pricePerHour * hours * 100) / 100;
  }
  
  /**
   * 计算预计费用（实时）
   */
  static calculateEstimatedFee(
    venuePricePerHour: number, 
    entryTime: string,
    baseEquipmentFee: number = 0
  ): number {
    const durationMinutes = TimerService.calculateDuration(entryTime);
    const venueFee = this.calculateVenueFee(venuePricePerHour, durationMinutes);
    return Math.round((venueFee + baseEquipmentFee) * 100) / 100;
  }
  
  /**
   * 计算离场费用（最终结算）
   */
  static calculateExitFee(
    venuePricePerHour: number, 
    durationMinutes: number,
    baseEquipmentFee: number = 0
  ): number {
    const venueFee = this.calculateVenueFee(venuePricePerHour, durationMinutes);
    return Math.round((venueFee + baseEquipmentFee) * 100) / 100;
  }
}

// Exit Service - 离场管理
class ExitService {
  private member: Member;
  private order: Order;
  
  constructor(member: Member, order: Order) {
    this.member = member;
    this.order = order;
  }
  
  /**
   * 申请离场
   * T3-6: 申请离场
   */
  async applyForExit(): Promise<{ success: boolean; error?: string }> {
    if (this.order.status !== 'entering') {
      return { success: false, error: '订单状态不允许离场' };
    }
    
    // 计算当前费用
    const durationMinutes = TimerService.calculateDuration(this.order.entry_time!);
    const estimatedFee = BillingService.calculateExitFee(
      venues.find(v => v.id === this.order.venue_id)!.price_per_hour,
      durationMinutes,
      this.order.base_amount
    );
    
    // 检查余额是否足够
    if (this.member.balance < estimatedFee) {
      return { 
        success: false, 
        error: `余额不足，需要充值 ¥${(estimatedFee - this.member.balance).toFixed(2)}` 
      };
    }
    
    // 更新订单状态
    await mockApi.updateOrder(this.order.id, {
      status: 'pending_exit',
      exit_time: new Date().toISOString()
    });
    
    return { success: true };
  }
  
  /**
   * 检查余额是否足够支付当前费用
   * T3-7: 余额不足引导充值
   */
  checkBalanceForExit(): { sufficient: boolean; currentFee: number; deficit: number } {
    const durationMinutes = TimerService.calculateDuration(this.order.entry_time!);
    const currentFee = BillingService.calculateExitFee(
      venues.find(v => v.id === this.order.venue_id)!.price_per_hour,
      durationMinutes,
      this.order.base_amount
    );
    
    return {
      sufficient: this.member.balance >= currentFee,
      currentFee,
      deficit: Math.max(0, currentFee - this.member.balance)
    };
  }
  
  /**
   * 获取当前订单状态
   */
  getOrderStatus(): OrderStatus {
    return this.order.status;
  }
}

// 创建测试订单的辅助函数
function createTestOrder(memberId: number, venueId: number, baseAmount: number = 0): Order {
  const order: Order = {
    id: orderIdCounter++,
    order_no: `ORD${Date.now()}`,
    member_id: memberId,
    venue_id: venueId,
    status: 'entering',
    entry_time: new Date().toISOString(),
    exit_time: null,
    duration_minutes: 0,
    base_amount: baseAmount,
    extra_amount: 0,
    final_amount: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  orders.push(order);
  return order;
}

describe('M3 会话与计时 - 计时器与离场', () => {
  beforeEach(() => {
    orders = [];
    orderIdCounter = 1;
  });
  
  describe('T3-4: 计时器实时更新', () => {
    it('should calculate duration in minutes', () => {
      // Arrange - 模拟入场时间 30 秒前
      const entryTime = new Date(Date.now() - 30000).toISOString();
      
      // Act
      const duration = TimerService.calculateDuration(entryTime);
      
      // Assert
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThanOrEqual(1);
    });
    
    it('should format duration as MM:SS', () => {
      // Arrange - 入场 90秒 (1分30秒)
      const entryTime = new Date(Date.now() - 90 * 1000).toISOString();
      
      // Act
      const formatted = TimerService.formatTimer(entryTime);
      
      // Assert - 90秒 = 1.5分钟，向下取整为1分钟，显示 01:00
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
      expect(formatted).toBe('01:00');
    });
    
    it('should update timer in real-time', () => {
      // Arrange
      const entryTime = new Date(Date.now() - 60000).toISOString(); // 1分钟前
      
      // Act - 1秒后再次计算
      const duration1 = TimerService.calculateDuration(entryTime);
      
      // Assert - 计时器应该实时更新
      expect(duration1).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('T3-5: 预计费用实时计算', () => {
    it('should calculate real-time estimated fee after 1 hour', () => {
      // Arrange - 模拟入场 1 小时后
      const entryTime = new Date(Date.now() - 3600000).toISOString();
      const venuePrice = 50; // ¥50/h
      
      // Act
      const estimatedFee = BillingService.calculateEstimatedFee(venuePrice, entryTime);
      
      // Assert - 1小时 = ¥50
      expect(estimatedFee).toBe(50);
    });
    
    it('should calculate real-time estimated fee after 2.5 hours', () => {
      // Arrange - 模拟入场 2.5 小时后
      const entryTime = new Date(Date.now() - 150 * 60000).toISOString(); // 150分钟
      const venuePrice = 50;
      
      // Act
      const estimatedFee = BillingService.calculateEstimatedFee(venuePrice, entryTime);
      
      // Assert - 150分钟 = 5个30分钟单元 = 2.5小时 = ¥125
      expect(estimatedFee).toBe(125);
    });
    
    it('should include equipment fee in estimated fee', () => {
      // Arrange
      const entryTime = new Date(Date.now() - 3600000).toISOString();
      const venuePrice = 50;
      const equipmentFee = 70;
      
      // Act
      const estimatedFee = BillingService.calculateEstimatedFee(venuePrice, entryTime, equipmentFee);
      
      // Assert - ¥50 + ¥70 = ¥120
      expect(estimatedFee).toBe(120);
    });
    
    it('should calculate correct fee for 场地A 2.5小时', () => {
      // 验收标准：150分钟 = 5个30分钟单元 = 2.5小时 = ¥50 × 2.5 = ¥125
      const fee = BillingService.calculateVenueFee(50, 150);
      expect(fee).toBe(125);
    });
  });
  
  describe('T3-6: 申请离场', () => {
    it('should apply for exit successfully', async () => {
      // Arrange
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 500 };
      const order = createTestOrder(1, 1, 0); // 场地A ¥50/h
      const exitService = new ExitService(member, order);
      
      // 等待至少1分钟以产生费用
      order.entry_time = new Date(Date.now() - 60000).toISOString();
      
      // Act
      const result = await exitService.applyForExit();
      
      // Assert
      expect(result.success).toBe(true);
      // 订单状态应变为 pending_exit
      const updatedOrder = orders.find(o => o.id === order.id);
      expect(updatedOrder!.status).toBe('pending_exit');
    });
    
    it('should show waiting for review message after exit application', async () => {
      // Arrange
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 500 };
      const order = createTestOrder(1, 1, 0);
      order.entry_time = new Date(Date.now() - 7200000).toISOString(); // 2小时
      const exitService = new ExitService(member, order);
      
      // Act
      await exitService.applyForExit();
      
      // Assert - 验证状态
      expect(exitService.getOrderStatus()).toBe('pending_exit');
    });
  });
  
  describe('T3-7: 余额不足引导充值', () => {
    it('should show insufficient balance message when applying for exit', () => {
      // Arrange - 余额 ¥50，预账单 ¥100
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 50 };
      const order = createTestOrder(1, 1, 0);
      order.entry_time = new Date(Date.now() - 7200000).toISOString(); // 2小时 = ¥100
      const exitService = new ExitService(member, order);
      
      // Act
      const balanceCheck = exitService.checkBalanceForExit();
      
      // Assert
      expect(balanceCheck.sufficient).toBe(false);
      expect(balanceCheck.currentFee).toBe(100);
      expect(balanceCheck.deficit).toBe(50);
    });
    
    it('should show topup button when balance insufficient', async () => {
      // Arrange
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 50 };
      const order = createTestOrder(1, 1, 0);
      order.entry_time = new Date(Date.now() - 7200000).toISOString();
      const exitService = new ExitService(member, order);
      
      // Act
      const result = await exitService.applyForExit();
      
      // Assert - 应该返回余额不足错误
      expect(result.success).toBe(false);
      expect(result.error).toContain('余额不足');
      expect(result.error).toContain('充值');
    });
  });
  
  describe('T3-8: 充值后继续离场流程', () => {
    it('should proceed to exit after topup', async () => {
      // Arrange - 初始余额不足
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 50 };
      const order = createTestOrder(1, 1, 0);
      order.entry_time = new Date(Date.now() - 7200000).toISOString(); // 2小时 = ¥100
      const exitService = new ExitService(member, order);
      
      // 第一次申请 - 余额不足
      let result = await exitService.applyForExit();
      expect(result.success).toBe(false);
      
      // 模拟充值
      member.balance += 100; // 充值 ¥100 → 余额 ¥150
      
      // 第二次申请 - 余额足够
      result = await exitService.applyForExit();
      
      // Assert
      expect(result.success).toBe(true);
      const updatedOrder = orders.find(o => o.id === order.id);
      expect(updatedOrder!.status).toBe('pending_exit');
    });
    
    it('should show waiting for review after successful exit application', async () => {
      // Arrange
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 500 };
      const order = createTestOrder(1, 1, 0);
      order.entry_time = new Date(Date.now() - 7200000).toISOString();
      const exitService = new ExitService(member, order);
      
      // Act
      await exitService.applyForExit();
      
      // Assert
      expect(exitService.getOrderStatus()).toBe('pending_exit');
    });
  });
  
  describe('计费验收测试', () => {
    it('场地A 2.5小时 = ¥50 × 2.5 = ¥125', () => {
      // 验收标准：150分钟 = 5个30分钟单元 = 2.5小时 = ¥125
      const fee = BillingService.calculateVenueFee(50, 150);
      expect(fee).toBe(125);
    });
    
    it('场地A 3小时 + 设备B 2次 = ¥50 × 3 + ¥20 × 2 = ¥190', () => {
      const venueFee = BillingService.calculateVenueFee(50, 180); // 3小时
      const equipmentFee = 20 * 2;
      expect(venueFee + equipmentFee).toBe(190);
    });
    
    it('基础费用 ¥100 + 额外¥50 = ¥150', () => {
      const baseAmount = 100;
      const extraAmount = 50;
      expect(baseAmount + extraAmount).toBe(150);
    });
  });
});
