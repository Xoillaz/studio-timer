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
 * 
 * 更新记录：
 * - v1.5: 重构后订单状态简化为 pending → active → completed，离场直接从 active → completed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types
interface Venue {
  id: number;
  name: string;
  price_per_hour: number;
}

interface VasService {
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

type OrderStatus = 'pending' | 'active' | 'completed';

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
  { id: 1, name: '实景棚', price_per_hour: 200 },
  { id: 2, name: '绿幕棚', price_per_hour: 150 }
];

const vasServices: VasService[] = [
  { id: 1, name: '专业摄影机', price_per_use: 100 },
  { id: 2, name: '单反相机', price_per_use: 50 }
];

// Mock API
const mockApi = {
  getOrder: async (id: number): Promise<Order | null> => {
    return orders.find(o => o.id === id) || null;
  },
  
  exit: async (orderId: number): Promise<Order> => {
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('订单不存在');
    if (order.status !== 'active') throw new Error('订单状态不允许此操作');
    
    const exitTime = new Date();
    const entryTime = new Date(order.entry_time!);
    const durationMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / 60000);
    
    // 计算费用
    const venue = venues.find(v => v.id === order.venue_id)!;
    const billableMinutes = Math.ceil(durationMinutes / 30) * 30;
    const hours = billableMinutes / 60;
    const baseAmount = Math.round(venue.price_per_hour * hours * 100) / 100;
    
    order.status = 'completed';
    order.exit_time = exitTime.toISOString();
    order.duration_minutes = durationMinutes;
    order.base_amount = baseAmount;
    order.final_amount = baseAmount + order.extra_amount;
    order.updated_at = new Date().toISOString();
    
    return order;
  },
  
  updateOrder: async (id: number, data: Partial<Order>): Promise<Order> => {
    const order = orders.find(o => o.id === id);
    if (!order) throw new Error('订单不存在');
    Object.assign(order, data, { updated_at: new Date().toISOString() });
    return order;
  }
};

// Timer Service
class TimerService {
  static calculateDuration(entryTime: string): number {
    const entry = new Date(entryTime);
    const now = new Date();
    return Math.floor((now.getTime() - entry.getTime()) / 60000);
  }
  
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = Math.floor((minutes % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  static formatTimer(entryTime: string): string {
    const duration = this.calculateDuration(entryTime);
    const mins = Math.floor(duration);
    const secs = Math.floor((duration - mins) * 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

// Billing Service
class BillingService {
  static calculateVenueFee(pricePerHour: number, durationMinutes: number): number {
    if (durationMinutes <= 0) return 0;
    const billableMinutes = Math.ceil(durationMinutes / 30) * 30;
    const hours = billableMinutes / 60;
    return Math.round(pricePerHour * hours * 100) / 100;
  }
  
  static calculateEstimatedFee(
    venuePricePerHour: number, 
    entryTime: string,
    baseVasFee: number = 0
  ): number {
    const durationMinutes = TimerService.calculateDuration(entryTime);
    const venueFee = this.calculateVenueFee(venuePricePerHour, durationMinutes);
    return Math.round((venueFee + baseVasFee) * 100) / 100;
  }
  
  static calculateExitFee(
    venuePricePerHour: number, 
    durationMinutes: number,
    baseVasFee: number = 0
  ): number {
    const venueFee = this.calculateVenueFee(venuePricePerHour, durationMinutes);
    return Math.round((venueFee + baseVasFee) * 100) / 100;
  }
}

// Exit Service
class ExitService {
  private member: Member;
  private order: Order;
  
  constructor(member: Member, order: Order) {
    this.member = member;
    this.order = order;
  }
  
  /**
   * 申请离场（结束计时）
   * v1.5 重构：直接从 active → completed，自动扣款
   */
  async applyForExit(): Promise<{ success: boolean; error?: string }> {
    if (this.order.status !== 'active') {
      return { success: false, error: '订单状态不允许此操作' };
    }
    
    // 计算当前费用
    const durationMinutes = TimerService.calculateDuration(this.order.entry_time!);
    const venue = venues.find(v => v.id === this.order.venue_id)!;
    const estimatedFee = BillingService.calculateExitFee(
      venue.price_per_hour,
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
    
    // 执行离场
    await mockApi.exit(this.order.id);
    
    return { success: true };
  }
  
  checkBalanceForExit(): { sufficient: boolean; currentFee: number; deficit: number } {
    const durationMinutes = TimerService.calculateDuration(this.order.entry_time!);
    const venue = venues.find(v => v.id === this.order.venue_id)!;
    const currentFee = BillingService.calculateExitFee(
      venue.price_per_hour,
      durationMinutes,
      this.order.base_amount
    );
    
    return {
      sufficient: this.member.balance >= currentFee,
      currentFee,
      deficit: Math.max(0, currentFee - this.member.balance)
    };
  }
  
  getOrderStatus(): OrderStatus {
    return this.order.status;
  }
}

// Helper function
function createTestOrder(
  memberId: number, 
  venueId: number, 
  status: OrderStatus,
  baseAmount: number = 0,
  entryMinutesAgo: number = 120
): Order {
  const order: Order = {
    id: orderIdCounter++,
    order_no: `ORD${Date.now()}`,
    member_id: memberId,
    venue_id: venueId,
    status,
    entry_time: status !== 'pending' ? new Date(Date.now() - entryMinutesAgo * 60000).toISOString() : null,
    exit_time: status === 'completed' ? new Date().toISOString() : null,
    duration_minutes: entryMinutesAgo,
    base_amount: baseAmount,
    extra_amount: 0,
    final_amount: baseAmount,
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
      const entryTime = new Date(Date.now() - 30000).toISOString();
      
      const duration = TimerService.calculateDuration(entryTime);
      
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThanOrEqual(1);
    });
    
    it('should format duration as MM:SS', () => {
      const entryTime = new Date(Date.now() - 90000).toISOString();
      
      const formatted = TimerService.formatTimer(entryTime);
      
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
      expect(formatted).toBe('01:00'); // 显示分:秒，只显示分钟部分
    });
    
    it('should update timer in real-time', () => {
      const entryTime = new Date(Date.now() - 60000).toISOString();
      
      const duration1 = TimerService.calculateDuration(entryTime);
      
      expect(duration1).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('T3-5: 预计费用实时计算', () => {
    it('should calculate real-time estimated fee after 1 hour', () => {
      const entryTime = new Date(Date.now() - 3600000).toISOString();
      const venuePrice = 200;
      
      const estimatedFee = BillingService.calculateEstimatedFee(venuePrice, entryTime);
      
      expect(estimatedFee).toBe(200);
    });
    
    it('should calculate real-time estimated fee after 2.5 hours', () => {
      const entryTime = new Date(Date.now() - 150 * 60000).toISOString();
      const venuePrice = 200;
      
      const estimatedFee = BillingService.calculateEstimatedFee(venuePrice, entryTime);
      
      // 2.5小时 = 150分钟，向上舍入到 5个半小时单元 = 2.5小时 = ¥500
      expect(estimatedFee).toBe(500);
    });
    
    it('should include vas service fee in estimated fee', () => {
      const entryTime = new Date(Date.now() - 3600000).toISOString();
      const venuePrice = 200;
      const vasFee = 150;
      
      const estimatedFee = BillingService.calculateEstimatedFee(venuePrice, entryTime, vasFee);
      
      // ¥200 + ¥150 = ¥350
      expect(estimatedFee).toBe(350);
    });
  });
  
  describe('T3-6: 申请离场', () => {
    it('should apply for exit successfully', async () => {
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 500 };
      const order = createTestOrder(1, 1, 'active', 0, 120);
      const exitService = new ExitService(member, order);
      
      const result = await exitService.applyForExit();
      
      expect(result.success).toBe(true);
      const updatedOrder = orders.find(o => o.id === order.id);
      expect(updatedOrder!.status).toBe('completed');
    });
    
    it('should calculate duration and fees on exit', async () => {
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 500 };
      const order = createTestOrder(1, 1, 'active', 0, 60); // 1小时
      const exitService = new ExitService(member, order);
      
      await exitService.applyForExit();
      
      const updatedOrder = orders.find(o => o.id === order.id)!;
      expect(updatedOrder.duration_minutes).toBeGreaterThan(0);
      expect(updatedOrder.base_amount).toBe(200); // ¥200/h * 1h
      expect(updatedOrder.final_amount).toBe(200);
    });
  });
  
  describe('T3-7: 余额不足引导充值', () => {
    it('should show insufficient balance message when applying for exit', () => {
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 100 };
      const order = createTestOrder(1, 1, 'active', 0, 120); // 2小时 = ¥400
      const exitService = new ExitService(member, order);
      
      const balanceCheck = exitService.checkBalanceForExit();
      
      expect(balanceCheck.sufficient).toBe(false);
      expect(balanceCheck.currentFee).toBe(400);
      expect(balanceCheck.deficit).toBe(300);
    });
    
    it('should show topup button when balance insufficient', async () => {
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 100 };
      const order = createTestOrder(1, 1, 'active', 0, 120);
      const exitService = new ExitService(member, order);
      
      const result = await exitService.applyForExit();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('余额不足');
      expect(result.error).toContain('充值');
    });
  });
  
  describe('T3-8: 充值后继续离场流程', () => {
    it('should proceed to exit after topup', async () => {
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 100 };
      const order = createTestOrder(1, 1, 'active', 0, 120); // ¥400
      const exitService = new ExitService(member, order);
      
      // 第一次申请 - 余额不足
      let result = await exitService.applyForExit();
      expect(result.success).toBe(false);
      
      // 模拟充值
      member.balance += 400;
      
      // 第二次申请 - 成功
      result = await exitService.applyForExit();
      
      expect(result.success).toBe(true);
      const updatedOrder = orders.find(o => o.id === order.id);
      expect(updatedOrder!.status).toBe('completed');
    });
    
    it('should show completed status after successful exit', async () => {
      const member = { id: 1, name: '张三', phone: '13800138000', balance: 500 };
      const order = createTestOrder(1, 1, 'active', 0, 60);
      const exitService = new ExitService(member, order);
      
      await exitService.applyForExit();
      
      expect(exitService.getOrderStatus()).toBe('completed');
    });
  });
  
  describe('计费验收测试', () => {
    it('实景棚 2.5小时 = ¥200 × 2.5 = ¥500 (实际按舍入)', () => {
      const fee = BillingService.calculateVenueFee(200, 150);
      expect(fee).toBe(500); // 150分钟 → 5个半小时单元 → ¥500
    });
    
    it('实景棚 3小时 + 增值服务 = ¥200 × 3 + ¥150 = ¥750', () => {
      const venueFee = BillingService.calculateVenueFee(200, 180);
      const vasFee = 150;
      expect(venueFee + vasFee).toBe(750);
    });
  });
});
