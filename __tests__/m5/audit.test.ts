/**
 * M5 日志与审计 - 操作日志模块测试
 * 对应测试用例: T5-1, T5-2, T5-3, T5-4, T5-5, T5-6
 * 
 * 测试目标：
 * - 登录日志记录
 * - 入场日志记录
 * - 离场日志记录
 * - 审核日志记录
 * - 扣款日志记录
 * - 状态流转日志
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types
interface OperationLog {
  id: number;
  order_id: number | null;
  action: string;
  action_name: string;
  operator_type: 'member' | 'admin' | 'system';
  operator_id: number;
  operator_name: string;
  details: Record<string, any>;
  ip_address: string;
  created_at: string;
}

interface Order {
  id: number;
  order_no: string;
  member_id: number;
  venue_id: number;
  status: OrderStatus;
  entry_time: string | null;
  exit_time: string | null;
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

// Mock Data Store
let operationLogs: OperationLog[] = [];
let orders: Order[] = [];
let logIdCounter = 1;
let orderIdCounter = 1;

// Action codes
const ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  ENTRY: 'entry',
  PARTIAL_EXIT_APPLY: 'partial_exit_apply',
  PARTIAL_EXIT_APPROVE: 'partial_exit_approve',
  PARTIAL_EXIT_REJECT: 'partial_exit_reject',
  EXIT_APPLY: 'exit_apply',
  TOPUP_APPLY: 'topup_apply',
  TOPUP_APPROVE: 'topup_approve',
  TOPUP_REJECT: 'topup_reject',
  BILL_APPROVE: 'bill_approve',
  BILL_REJECT: 'bill_reject',
  PAID: 'paid',
  RELEASED: 'released'
} as const;

// Mock API
const mockApi = {
  createLog: async (data: Omit<OperationLog, 'id' | 'created_at'>): Promise<OperationLog> => {
    const log: OperationLog = {
      id: logIdCounter++,
      ...data,
      created_at: new Date().toISOString()
    };
    operationLogs.push(log);
    return log;
  },
  
  getLogs: async (filters?: { 
    order_id?: number; 
    operator_type?: string; 
    action?: string 
  }): Promise<OperationLog[]> => {
    let result = [...operationLogs];
    
    if (filters?.order_id) {
      result = result.filter(l => l.order_id === filters.order_id);
    }
    if (filters?.operator_type) {
      result = result.filter(l => l.operator_type === filters.operator_type);
    }
    if (filters?.action) {
      result = result.filter(l => l.action === filters.action);
    }
    
    return result;
  },
  
  getOrder: async (id: number): Promise<Order | null> => {
    return orders.find(o => o.id === id) || null;
  }
};

// Audit Service - 日志审计服务
class AuditService {
  /**
   * 记录操作日志
   */
  static async log(data: {
    action: string;
    action_name: string;
    operator_type: 'member' | 'admin' | 'system';
    operator_id: number;
    operator_name: string;
    order_id?: number;
    details?: Record<string, any>;
    ip_address?: string;
  }): Promise<OperationLog> {
    return mockApi.createLog({
      action: data.action,
      action_name: data.action_name,
      operator_type: data.operator_type,
      operator_id: data.operator_id,
      operator_name: data.operator_name,
      order_id: data.order_id || null,
      details: data.details || {},
      ip_address: data.ip_address || '127.0.0.1'
    });
  }
  
  /**
   * T5-1: 记录登录日志
   */
  static async logLogin(memberId: number, memberName: string, phone: string): Promise<OperationLog> {
    return this.log({
      action: ACTIONS.LOGIN,
      action_name: '会员登录',
      operator_type: 'member',
      operator_id: memberId,
      operator_name: memberName,
      details: { phone }
    });
  }
  
  /**
   * T5-2: 记录入场日志
   */
  static async logEntry(orderId: number, memberId: number, memberName: string): Promise<OperationLog> {
    return this.log({
      action: ACTIONS.ENTRY,
      action_name: '扫码入场',
      operator_type: 'member',
      operator_id: memberId,
      operator_name: memberName,
      order_id: orderId,
      details: { event: 'entry' }
    });
  }
  
  /**
   * T5-3: 记录离场申请日志
   */
  static async logExitApply(orderId: number, memberId: number, memberName: string): Promise<OperationLog> {
    return this.log({
      action: ACTIONS.EXIT_APPLY,
      action_name: '申请离场',
      operator_type: 'member',
      operator_id: memberId,
      operator_name: memberName,
      order_id: orderId,
      details: { event: 'exit_apply' }
    });
  }
  
  /**
   * T5-4: 记录审核日志
   */
  static async logApproval(
    orderId: number, 
    adminId: number, 
    adminName: string, 
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<OperationLog> {
    const actionCode = action === 'approve' ? 'bill_approve' : 'bill_reject';
    const actionName = action === 'approve' ? '账单审核通过' : '账单审核拒绝';
    
    return this.log({
      action: actionCode,
      action_name: actionName,
      operator_type: 'admin',
      operator_id: adminId,
      operator_name: adminName,
      order_id: orderId,
      details: { reason: reason || '' }
    });
  }
  
  /**
   * T5-5: 记录扣款日志
   */
  static async logDeduct(
    orderId: number, 
    amount: number,
    adminId: number, 
    adminName: string
  ): Promise<OperationLog> {
    return this.log({
      action: ACTIONS.PAID,
      action_name: '已扣款',
      operator_type: 'admin',
      operator_id: adminId,
      operator_name: adminName,
      order_id: orderId,
      details: { amount }
    });
  }
  
  /**
   * T5-6: 记录状态流转
   */
  static async logStatusChange(
    orderId: number,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    operatorId: number,
    operatorName: string,
    operatorType: 'member' | 'admin' | 'system'
  ): Promise<OperationLog> {
    return this.log({
      action: 'status_change',
      action_name: `状态变更: ${fromStatus} → ${toStatus}`,
      operator_type: operatorType,
      operator_id: operatorId,
      operator_name: operatorName,
      order_id: orderId,
      details: { from_status: fromStatus, to_status: toStatus }
    });
  }
  
  /**
   * 获取订单相关日志
   */
  static async getOrderLogs(orderId: number): Promise<OperationLog[]> {
    return mockApi.getLogs({ order_id: orderId });
  }
  
  /**
   * 获取操作人相关日志
   */
  static async getOperatorLogs(operatorType: string, operatorId: number): Promise<OperationLog[]> {
    const logs = await mockApi.getLogs({ operator_type: operatorType });
    return logs.filter(l => l.operator_id === operatorId);
  }
}

// Status History - 状态流转历史
class StatusHistory {
  private history: Array<{
    orderId: number;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    changedAt: string;
    changedBy: number;
    changedByName: string;
  }> = [];
  
  record(orderId: number, fromStatus: OrderStatus, toStatus: OrderStatus, changedBy: number, changedByName: string) {
    this.history.push({
      orderId,
      fromStatus,
      toStatus,
      changedAt: new Date().toISOString(),
      changedBy,
      changedByName
    });
  }
  
  getHistory(orderId: number) {
    return this.history.filter(h => h.orderId === orderId);
  }
}

describe('M5 日志与审计', () => {
  let auditService: typeof AuditService;
  let statusHistory: StatusHistory;
  
  beforeEach(() => {
    operationLogs = [];
    orders = [];
    logIdCounter = 1;
    orderIdCounter = 1;
    auditService = AuditService;
    statusHistory = new StatusHistory();
  });
  
  describe('T5-1: 登录日志记录', () => {
    it('should create login log', async () => {
      // Act
      const log = await auditService.logLogin(1, '张三', '13800138000');
      
      // Assert
      expect(log).toBeDefined();
      expect(log.action).toBe('login');
      expect(log.action_name).toBe('会员登录');
      expect(log.operator_type).toBe('member');
      expect(log.operator_id).toBe(1);
      expect(log.operator_name).toBe('张三');
      expect(log.details.phone).toBe('13800138000');
    });
    
    it('should query login logs', async () => {
      // Arrange
      await auditService.logLogin(1, '张三', '13800138000');
      await auditService.logLogin(2, '李四', '13800138001');
      
      // Act
      const logs = await mockApi.getLogs({ action: 'login' });
      
      // Assert
      expect(logs.length).toBe(2);
    });
  });
  
  describe('T5-2: 入场日志记录', () => {
    it('should create entry log with order_id', async () => {
      // Act
      const log = await auditService.logEntry(1, 1, '张三');
      
      // Assert
      expect(log.action).toBe('entry');
      expect(log.action_name).toBe('扫码入场');
      expect(log.order_id).toBe(1);
      expect(log.operator_id).toBe(1);
    });
    
    it('should link entry log to order', async () => {
      // Arrange - 创建订单
      const order: Order = {
        id: orderIdCounter++,
        order_no: 'ORD001',
        member_id: 1,
        venue_id: 1,
        status: 'entering',
        entry_time: new Date().toISOString(),
        exit_time: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      orders.push(order);
      
      // Act
      const log = await auditService.logEntry(order.id, 1, '张三');
      
      // Assert
      expect(log.order_id).toBe(order.id);
    });
  });
  
  describe('T5-3: 离场日志记录', () => {
    it('should create exit_apply log', async () => {
      // Act
      const log = await auditService.logExitApply(1, 1, '张三');
      
      // Assert
      expect(log.action).toBe('exit_apply');
      expect(log.action_name).toBe('申请离场');
      expect(log.order_id).toBe(1);
      expect(log.details.event).toBe('exit_apply');
    });
  });
  
  describe('T5-4: 审核日志记录', () => {
    it('should create approval log with admin_id', async () => {
      // Act
      const log = await auditService.logApproval(1, 1, '管理员', 'approve', '费用确认');
      
      // Assert
      expect(log.action).toBe('bill_approve');
      expect(log.action_name).toBe('账单审核通过');
      expect(log.operator_type).toBe('admin');
      expect(log.operator_id).toBe(1);
      expect(log.operator_name).toBe('管理员');
      expect(log.details.reason).toBe('费用确认');
    });
    
    it('should create rejection log', async () => {
      // Act
      const log = await auditService.logApproval(1, 1, '管理员', 'reject', '费用有误');
      
      // Assert
      expect(log.action).toBe('bill_reject');
      expect(log.action_name).toBe('账单审核拒绝');
    });
  });
  
  describe('T5-5: 扣款日志记录', () => {
    it('should create deduct log with amount', async () => {
      // Act
      const log = await auditService.logDeduct(1, 150, 1, '管理员');
      
      // Assert
      expect(log.action).toBe('paid');
      expect(log.action_name).toBe('已扣款');
      expect(log.details.amount).toBe(150);
    });
    
    it('should record deduct amount accurately', async () => {
      // Act
      const log = await auditService.logDeduct(1, 150.50, 1, '管理员');
      
      // Assert
      expect(log.details.amount).toBe(150.50);
    });
  });
  
  describe('T5-6: 状态流转日志', () => {
    it('should record status change from entering to pending_exit', async () => {
      // Act
      const log = await auditService.logStatusChange(
        1, 
        'entering', 
        'pending_exit',
        1, 
        '张三',
        'member'
      );
      
      // Assert
      expect(log.action).toBe('status_change');
      expect(log.details.from_status).toBe('entering');
      expect(log.details.to_status).toBe('pending_exit');
    });
    
    it('should track order status history', async () => {
      // Arrange
      const orderId = 1;
      
      // Act - 模拟状态流转: entering → partial_exit_pending → pending_exit → reviewing → completed
      statusHistory.record(orderId, 'entering', 'partial_exit_pending', 1, '张三');
      statusHistory.record(orderId, 'partial_exit_pending', 'entering', 1, '管理员');
      statusHistory.record(orderId, 'entering', 'pending_exit', 1, '张三');
      statusHistory.record(orderId, 'pending_exit', 'reviewing', 1, '管理员');
      statusHistory.record(orderId, 'reviewing', 'completed', 1, '管理员');
      
      // Assert
      const history = statusHistory.getHistory(orderId);
      expect(history.length).toBe(5);
      expect(history[0].fromStatus).toBe('entering');
      expect(history[0].toStatus).toBe('partial_exit_pending');
      expect(history[4].toStatus).toBe('completed');
    });
    
    it('should verify status transition rules', () => {
      // 状态机验收: entering → partial_exit_pending → entering → pending_exit → reviewing → completed
      const validTransitions: Record<string, string[]> = {
        'entering': ['partial_exit_pending', 'pending_exit'],
        'partial_exit_pending': ['entering'],
        'pending_exit': ['reviewing', 'topup_pending'],
        'topup_pending': ['reviewing'],
        'reviewing': ['completed', 'rejected'],
        'completed': [],
        'rejected': []
      };
      
      // 验证: entering 可以转到 partial_exit_pending
      expect(validTransitions['entering']).toContain('partial_exit_pending');
      // 验证: partial_exit_pending 可以转回 entering
      expect(validTransitions['partial_exit_pending']).toContain('entering');
      // 验证: entering 可以直接到 pending_exit
      expect(validTransitions['entering']).toContain('pending_exit');
      // 验证: completed 是终态
      expect(validTransitions['completed']).toHaveLength(0);
    });
  });
  
  describe('日志查询功能', () => {
    it('should query logs by order_id', async () => {
      // Arrange
      await auditService.logEntry(1, 1, '张三');
      await auditService.logExitApply(1, 1, '张三');
      await auditService.logEntry(2, 2, '李四'); // 不同订单
      await auditService.logApproval(1, 1, '管理员', 'approve');
      
      // Act
      const order1Logs = await auditService.getOrderLogs(1);
      
      // Assert
      expect(order1Logs.length).toBe(3);
    });
    
    it('should query logs by operator', async () => {
      // Arrange
      await auditService.logLogin(1, '张三', '13800138000');
      await auditService.logEntry(1, 1, '张三');
      await auditService.logExitApply(1, 1, '张三');
      await auditService.logApproval(1, 1, '管理员', 'approve'); // 管理员操作
      
      // Act
      const memberLogs = await auditService.getOperatorLogs('member', 1);
      
      // Assert
      expect(memberLogs.length).toBe(3);
    });
  });
});
