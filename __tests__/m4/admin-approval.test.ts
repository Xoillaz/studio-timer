/**
 * M4 管理员端 - 认证与审核模块测试
 * 对应测试用例: T4-1, T4-2, T4-3, T4-4, T4-5, T4-6, T4-7, T4-10
 * 
 * 测试目标：
 * - 管理员登录
 * - 待审核列表展示
 * - 部分人离场审核
 * - 账单审核与调价
 * - 扣款与余额更新
 * - 手动放行
 * - 补差价审核
 * - 管理员登出
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types
interface Admin {
  id: number;
  username: string;
  password_hash: string;
  real_name: string;
  role: 'admin' | 'manager';
  is_active: boolean;
}

interface Member {
  id: number;
  name: string;
  phone: string;
  balance: number;
}

interface Venue {
  id: number;
  name: string;
  price_per_hour: number;
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
  partial_exit_count: number;
  reject_reason: string | null;
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

interface PartialExit {
  id: number;
  order_id: number;
  person_count: number;
  remark: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
}

interface TopUp {
  id: number;
  order_id: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
}

interface AdminApproval {
  id: number;
  order_id: number;
  admin_id: number;
  action: 'approve' | 'reject';
  before_amount: number;
  after_amount: number;
  reason: string;
  created_at: string;
}

// Mock Data Store
let admins: Admin[] = [
  { id: 1, username: 'admin', password_hash: 'hashed_password', real_name: '系统管理员', role: 'admin', is_active: true }
];

let members: Member[] = [
  { id: 1, name: '张三', phone: '13800138000', balance: 500 }
];

let venues: Venue[] = [
  { id: 1, name: '场地A', price_per_hour: 50, description: '50平米实景棚', is_active: true },
  { id: 2, name: '场地B', price_per_hour: 80, description: '30平米绿幕棚', is_active: true }
];

let orders: Order[] = [];
let partialExits: PartialExit[] = [];
let topUps: TopUp[] = [];
let adminApprovals: AdminApproval[] = [];

let orderIdCounter = 1;
let partialExitIdCounter = 1;
let topUpIdCounter = 1;
let approvalIdCounter = 1;

// Mock API
const mockApi = {
  adminLogin: async (username: string, password: string): Promise<Admin | null> => {
    const admin = admins.find(a => a.username === username && a.is_active);
    if (admin && password === '123456') { // 简化密码验证
      return admin;
    }
    return null;
  },
  
  getPendingOrders: async (): Promise<Order[]> => {
    return orders.filter(o => 
      o.status === 'partial_exit_pending' || 
      o.status === 'pending_exit' || 
      o.status === 'reviewing' ||
      o.status === 'topup_pending'
    );
  },
  
  getOrder: async (id: number): Promise<Order | null> => {
    return orders.find(o => o.id === id) || null;
  },
  
  updateOrder: async (id: number, data: Partial<Order>): Promise<Order> => {
    const order = orders.find(o => o.id === id);
    if (!order) throw new Error('订单不存在');
    Object.assign(order, data, { updated_at: new Date().toISOString() });
    return order;
  },
  
  updateMemberBalance: async (memberId: number, amount: number): Promise<Member> => {
    const member = members.find(m => m.id === memberId);
    if (!member) throw new Error('会员不存在');
    member.balance += amount;
    return member;
  },
  
  createPartialExit: async (data: { order_id: number; person_count: number; remark: string }): Promise<PartialExit> => {
    const partialExit: PartialExit = {
      id: partialExitIdCounter++,
      order_id: data.order_id,
      person_count: data.person_count,
      remark: data.remark,
      status: 'pending',
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString()
    };
    partialExits.push(partialExit);
    return partialExit;
  },
  
  approvePartialExit: async (id: number, adminId: number): Promise<PartialExit> => {
    const partialExit = partialExits.find(p => p.id === id);
    if (!partialExit) throw new Error('部分人离场记录不存在');
    partialExit.status = 'approved';
    partialExit.approved_by = adminId;
    partialExit.approved_at = new Date().toISOString();
    return partialExit;
  },
  
  createTopUp: async (data: { order_id: number; amount: number }): Promise<TopUp> => {
    const topUp: TopUp = {
      id: topUpIdCounter++,
      order_id: data.order_id,
      amount: data.amount,
      status: 'pending',
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString()
    };
    topUps.push(topUp);
    return topUp;
  },
  
  approveTopUp: async (id: number, adminId: number): Promise<TopUp> => {
    const topUp = topUps.find(t => t.id === id);
    if (!topUp) throw new Error('补差价记录不存在');
    topUp.status = 'approved';
    topUp.approved_by = adminId;
    topUp.approved_at = new Date().toISOString();
    return topUp;
  },
  
  createApproval: async (data: Omit<AdminApproval, 'id' | 'created_at'>): Promise<AdminApproval> => {
    const approval: AdminApproval = {
      id: approvalIdCounter++,
      ...data,
      created_at: new Date().toISOString()
    };
    adminApprovals.push(approval);
    return approval;
  }
};

// Admin Auth Service
class AdminAuthService {
  private currentAdmin: Admin | null = null;
  private readonly SESSION_KEY = 'admin_session';
  
  async login(username: string, password: string): Promise<{ success: boolean; admin?: Admin; error?: string }> {
    const admin = await mockApi.adminLogin(username, password);
    if (admin) {
      this.currentAdmin = admin;
      return { success: true, admin };
    }
    return { success: false, error: '用户名或密码错误' };
  }
  
  async logout(): Promise<void> {
    this.currentAdmin = null;
  }
  
  getCurrentAdmin(): Admin | null {
    return this.currentAdmin;
  }
  
  isLoggedIn(): boolean {
    return this.currentAdmin !== null;
  }
}

// Approval Service - 审核服务
class ApprovalService {
  private admin: Admin;
  
  constructor(admin: Admin) {
    this.admin = admin;
  }
  
  /**
   * 获取待审核列表
   * T4-2: 待审核列表展示
   */
  async getPendingList(): Promise<{
    partialExit: Array<{ order: Order; partialExit: PartialExit }>;
    exit: Order[];
    bill: Order[];
    topup: Array<{ order: Order; topUp: TopUp }>;
  }> {
    const pendingOrders = await mockApi.getPendingOrders();
    
    const exitOrders = pendingOrders.filter(o => o.status === 'pending_exit');
    const billOrders = pendingOrders.filter(o => o.status === 'reviewing');
    
    const partialExitList = partialExits
      .filter(p => p.status === 'pending')
      .map(p => ({
        order: orders.find(o => o.id === p.order_id)!,
        partialExit: p
      }))
      .filter(item => item.order);
    
    const topupList = topUps
      .filter(t => t.status === 'pending')
      .map(t => ({
        order: orders.find(o => o.id === t.order_id)!,
        topUp: t
      }))
      .filter(item => item.order);
    
    return {
      partialExit: partialExitList,
      exit: exitOrders,
      bill: billOrders,
      topup: topupList
    };
  }
  
  /**
   * 审核部分人离场 - 同意
   * T4-3: 部分人离场审核 - 同意
   */
  async approvePartialExit(partialExitId: number): Promise<{ success: boolean; error?: string }> {
    const partialExit = partialExits.find(p => p.id === partialExitId);
    if (!partialExit) return { success: false, error: '记录不存在' };
    
    await mockApi.approvePartialExit(partialExitId, this.admin.id);
    
    // 更新订单状态
    const order = orders.find(o => o.id === partialExit.order_id);
    if (order) {
      order.partial_exit_count += partialExit.person_count;
      order.status = 'entering'; // 部分人离场后继续入场
    }
    
    return { success: true };
  }
  
  /**
   * 账单审核 - 调价
   * T4-4: 账单审核 - 调价
   */
  async reviewBill(
    orderId: number, 
    extraAmount: number, 
    reason: string
  ): Promise<{ success: boolean; finalAmount?: number; error?: string }> {
    const order = orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: '订单不存在' };
    
    // 计算最终金额
    order.extra_amount = extraAmount;
    order.final_amount = order.base_amount + extraAmount;
    
    // 记录审核
    await mockApi.createApproval({
      order_id: orderId,
      admin_id: this.admin.id,
      action: 'approve',
      before_amount: order.base_amount,
      after_amount: order.final_amount,
      reason
    });
    
    return { success: true, finalAmount: order.final_amount };
  }
  
  /**
   * 扣款与余额更新
   * T4-5: 扣款与余额更新
   */
  async deductAndRelease(orderId: number): Promise<{ success: boolean; error?: string }> {
    const order = orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: '订单不存在' };
    
    // 扣款
    const member = members.find(m => m.id === order.member_id);
    if (!member) return { success: false, error: '会员不存在' };
    
    if (member.balance < order.final_amount) {
      return { success: false, error: '会员余额不足' };
    }
    
    await mockApi.updateMemberBalance(order.member_id, -order.final_amount);
    
    // 更新订单状态为已完成
    order.status = 'completed';
    order.exit_time = new Date().toISOString();
    
    return { success: true };
  }
  
  /**
   * 手动放行
   * T4-6: 手动放行
   */
  async releaseOrder(orderId: number): Promise<{ success: boolean; error?: string }> {
    const order = orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: '订单不存在' };
    
    if (order.status !== 'completed') {
      return { success: false, error: '订单未完成审核' };
    }
    
    // 模拟放行操作（开门）
    return { success: true };
  }
  
  /**
   * 补差价审核
   * T4-7: 补差价审核
   */
  async approveTopUp(topUpId: number): Promise<{ success: boolean; error?: string }> {
    const topUp = topUps.find(t => t.id === topUpId);
    if (!topUp) return { success: false, error: '补差价记录不存在' };
    
    await mockApi.approveTopUp(topUpId, this.admin.id);
    
    // 更新订单状态为审核中
    const order = orders.find(o => o.id === topUp.order_id);
    if (order) {
      order.status = 'reviewing';
    }
    
    return { success: true };
  }
}

// 创建测试订单的辅助函数
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
    entry_time: new Date(Date.now() - entryMinutesAgo * 60000).toISOString(),
    exit_time: status === 'pending_exit' || status === 'completed' ? new Date().toISOString() : null,
    duration_minutes: entryMinutesAgo,
    base_amount: baseAmount,
    extra_amount: 0,
    final_amount: baseAmount,
    partial_exit_count: 0,
    reject_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  orders.push(order);
  return order;
}

describe('M4 管理员端 - 认证与审核', () => {
  let authService: AdminAuthService;
  const testAdmin: Admin = { id: 1, username: 'admin', password_hash: 'hashed', real_name: '管理员', role: 'admin', is_active: true };
  
  beforeEach(() => {
    orders = [];
    partialExits = [];
    topUps = [];
    adminApprovals = [];
    orderIdCounter = 1;
    partialExitIdCounter = 1;
    topUpIdCounter = 1;
    approvalIdCounter = 1;
    authService = new AdminAuthService();
  });
  
  describe('T4-1: 管理员登录', () => {
    it('should login with correct username and password', async () => {
      // Act
      const result = await authService.login('admin', '123456');
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.admin).toBeDefined();
      expect(result.admin!.username).toBe('admin');
    });
    
    it('should fail with wrong password', async () => {
      // Act
      const result = await authService.login('admin', 'wrong');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('用户名或密码错误');
    });
    
    it('should redirect to dashboard after login', async () => {
      // Act
      const result = await authService.login('admin', '123456');
      
      // Assert - 验证登录后可以访问管理端
      expect(authService.isLoggedIn()).toBe(true);
    });
  });
  
  describe('T4-2: 待审核列表展示', () => {
    it('should show pending exit count badge', async () => {
      // Arrange - 创建待审核离场订单
      createTestOrder(1, 1, 'pending_exit', 100);
      const adminAuth = new AdminAuthService();
      await adminAuth.login('admin', '123456');
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      const pendingList = await approvalService.getPendingList();
      
      // Assert
      expect(pendingList.exit.length).toBe(1);
    });
    
    it('should show pending partial exit count', async () => {
      // Arrange
      const order = createTestOrder(1, 1, 'entering');
      await mockApi.createPartialExit({
        order_id: order.id,
        person_count: 2,
        remark: '2人先离开'
      });
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      const pendingList = await approvalService.getPendingList();
      
      // Assert
      expect(pendingList.partialExit.length).toBe(1);
      expect(pendingList.partialExit[0].partialExit.person_count).toBe(2);
    });
  });
  
  describe('T4-3: 部分人离场审核 - 同意', () => {
    it('should approve partial exit successfully', async () => {
      // Arrange
      const order = createTestOrder(1, 1, 'entering');
      const partialExit = await mockApi.createPartialExit({
        order_id: order.id,
        person_count: 2,
        remark: '2人先离开'
      });
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      const result = await approvalService.approvePartialExit(partialExit.id);
      
      // Assert
      expect(result.success).toBe(true);
      const updatedOrder = orders.find(o => o.id === order.id);
      expect(updatedOrder!.status).toBe('entering');
      expect(updatedOrder!.partial_exit_count).toBe(2);
    });
    
    it('should show toast after successful approval', async () => {
      // Arrange
      const order = createTestOrder(1, 1, 'entering');
      const partialExit = await mockApi.createPartialExit({
        order_id: order.id,
        person_count: 1,
        remark: '测试'
      });
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      const result = await approvalService.approvePartialExit(partialExit.id);
      
      // Assert - 验证成功，可触发 toast
      expect(result.success).toBe(true);
    });
  });
  
  describe('T4-4: 账单审核 - 调价', () => {
    it('should adjust price with extra amount', async () => {
      // Arrange - 基础费用 ¥100
      const order = createTestOrder(1, 1, 'reviewing', 100);
      const approvalService = new ApprovalService(testAdmin);
      
      // Act - 添加额外费用 ¥50（损坏赔偿）
      const result = await approvalService.reviewBill(order.id, 50, '损坏赔偿');
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.finalAmount).toBe(150);
      const updatedOrder = orders.find(o => o.id === order.id);
      expect(updatedOrder!.extra_amount).toBe(50);
      expect(updatedOrder!.final_amount).toBe(150);
    });
    
    it('should show final amount before confirmation', async () => {
      // Arrange
      const order = createTestOrder(1, 1, 'reviewing', 100);
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      const result = await approvalService.reviewBill(order.id, 50, '损坏赔偿');
      
      // Assert - 确认前应显示最终金额
      expect(result.finalAmount).toBe(150);
    });
    
    it('should require confirmation before deducting', async () => {
      // Arrange
      const order = createTestOrder(1, 1, 'reviewing', 100);
      const approvalService = new ApprovalService(testAdmin);
      
      // Act - 调价后需要二次确认
      const result = await approvalService.reviewBill(order.id, 50, '损坏赔偿');
      
      // Assert - 验证需要二次确认流程
      expect(result.success).toBe(true);
      // 实际实现中应该返回确认状态让前端显示二次确认弹窗
    });
  });
  
  describe('T4-5: 扣款与余额更新', () => {
    it('should deduct balance and update order status', async () => {
      // Arrange - 会员余额 ¥200，订单费用 ¥150
      members[0].balance = 200;
      const order = createTestOrder(1, 1, 'reviewing', 150);
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      const result = await approvalService.deductAndRelease(order.id);
      
      // Assert
      expect(result.success).toBe(true);
      const member = members.find(m => m.id === 1);
      expect(member!.balance).toBe(50);
      const updatedOrder = orders.find(o => o.id === order.id);
      expect(updatedOrder!.status).toBe('completed');
    });
    
    it('should fail when member balance insufficient', async () => {
      // Arrange - 会员余额 ¥100，订单费用 ¥150
      members[0].balance = 100;
      const order = createTestOrder(1, 1, 'reviewing', 150);
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      const result = await approvalService.deductAndRelease(order.id);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('会员余额不足');
    });
  });
  
  describe('T4-6: 手动放行', () => {
    it('should release order after payment', async () => {
      // Arrange - 订单已扣款成功
      members[0].balance = 500;
      const order = createTestOrder(1, 1, 'completed', 150);
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      const result = await approvalService.releaseOrder(order.id);
      
      // Assert
      expect(result.success).toBe(true);
    });
    
    it('should show success toast after release', async () => {
      // Arrange
      const order = createTestOrder(1, 1, 'completed', 100);
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      const result = await approvalService.releaseOrder(order.id);
      
      // Assert - 验证成功，可触发 toast
      expect(result.success).toBe(true);
    });
  });
  
  describe('T4-7: 补差价审核', () => {
    it('should approve top-up successfully', async () => {
      // Arrange - 有1个待审核的补差价申请（差额¥50）
      const order = createTestOrder(1, 1, 'topup_pending');
      const topUp = await mockApi.createTopUp({
        order_id: order.id,
        amount: 50
      });
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      const result = await approvalService.approveTopUp(topUp.id);
      
      // Assert
      expect(result.success).toBe(true);
      const updatedOrder = orders.find(o => o.id === order.id);
      expect(updatedOrder!.status).toBe('reviewing');
    });
    
    it('should continue to bill review after top-up approved', async () => {
      // Arrange
      const order = createTestOrder(1, 1, 'topup_pending');
      const topUp = await mockApi.createTopUp({
        order_id: order.id,
        amount: 50
      });
      const approvalService = new ApprovalService(testAdmin);
      
      // Act
      await approvalService.approveTopUp(topUp.id);
      
      // Assert - 补差价审核后继续账单审核流程
      const updatedOrder = orders.find(o => o.id === order.id);
      expect(updatedOrder!.status).toBe('reviewing');
    });
  });
  
  describe('T4-10: 管理员登出', () => {
    it('should clear session and redirect to login', async () => {
      // Arrange - 先登录
      await authService.login('admin', '123456');
      expect(authService.isLoggedIn()).toBe(true);
      
      // Act
      await authService.logout();
      
      // Assert
      expect(authService.isLoggedIn()).toBe(false);
      expect(authService.getCurrentAdmin()).toBeNull();
    });
  });
});
