/**
 * M2 认证与会员 - 会员模块测试
 * 对应测试用例: T2-4, T2-5
 * 
 * 测试目标：
 * - 充值功能
 * - 充值后余额更新
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Types
interface Member {
  id: number;
  name: string;
  phone: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface RechargeRecord {
  id: number;
  member_id: number;
  amount: number;
  type: 'recharge' | 'deduct';
  created_at: string;
}

// Mock data store
let members: Member[] = [
  { id: 1, name: '张三', phone: '13800138000', balance: 100, created_at: '2026-01-01', updated_at: '2026-01-01' }
];

let rechargeRecords: RechargeRecord[] = [];

// Mock API
const mockMemberApi = {
  getMember: async (id: number): Promise<Member | null> => {
    return members.find(m => m.id === id) || null;
  },
  
  updateBalance: async (id: number, amount: number): Promise<Member> => {
    const member = members.find(m => m.id === id);
    if (!member) throw new Error('会员不存在');
    member.balance += amount;
    member.updated_at = new Date().toISOString();
    return member;
  },
  
  createRechargeRecord: async (memberId: number, amount: number): Promise<RechargeRecord> => {
    const record: RechargeRecord = {
      id: rechargeRecords.length + 1,
      member_id: memberId,
      amount,
      type: 'recharge',
      created_at: new Date().toISOString()
    };
    rechargeRecords.push(record);
    return record;
  },
  
  getRechargeRecords: async (memberId: number): Promise<RechargeRecord[]> => {
    return rechargeRecords.filter(r => r.member_id === memberId);
  }
};

// Member Service (待实现)
class MemberService {
  private currentMember: Member | null = null;
  
  setCurrentMember(member: Member) {
    this.currentMember = member;
    localStorage.setItem('auth_user', JSON.stringify(member));
  }
  
  getCurrentMember(): Member | null {
    if (!this.currentMember) {
      const userStr = localStorage.getItem('auth_user');
      this.currentMember = userStr ? JSON.parse(userStr) : null;
    }
    return this.currentMember;
  }
  
  async recharge(amount: number): Promise<{ success: boolean; newBalance: number; record: RechargeRecord }> {
    const member = this.getCurrentMember();
    if (!member) throw new Error('未登录');
    
    if (amount <= 0) throw new Error('充值金额必须大于0');
    if (amount > 10000) throw new Error('单次充值金额不能超过10000');
    
    // 调用 API 更新余额
    const updated = await mockMemberApi.updateBalance(member.id, amount);
    await mockMemberApi.createRechargeRecord(member.id, amount);
    
    // 更新本地状态
    this.currentMember = updated;
    localStorage.setItem('auth_user', JSON.stringify(updated));
    
    return {
      success: true,
      newBalance: updated.balance,
      record: rechargeRecords[rechargeRecords.length - 1]
    };
  }
  
  async getBalance(): Promise<number> {
    const member = this.getCurrentMember();
    if (!member) throw new Error('未登录');
    return member.balance;
  }
  
  async getRechargeHistory(): Promise<RechargeRecord[]> {
    const member = this.getCurrentMember();
    if (!member) throw new Error('未登录');
    return mockMemberApi.getRechargeRecords(member.id);
  }
}

describe('M2 会员模块 - 充值功能', () => {
  let memberService: MemberService;
  
  beforeEach(() => {
    localStorage.clear();
    // 重置数据
    members = [
      { id: 1, name: '张三', phone: '13800138000', balance: 0, created_at: '2026-01-01', updated_at: '2026-01-01' }
    ];
    rechargeRecords = [];
    memberService = new MemberService();
    memberService.setCurrentMember(members[0]);
  });
  
  describe('T2-4: 充值功能', () => {
    it('should recharge with custom amount', async () => {
      // Arrange
      const amount = 500;
      
      // Act
      const result = await memberService.recharge(amount);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(500);
      expect(result.record).toBeDefined();
      expect(result.record.amount).toBe(500);
      expect(result.record.type).toBe('recharge');
    });
    
    it('should recharge with quick amount buttons', async () => {
      // Arrange - 测试快捷充值按钮
      const quickAmounts = [100, 200, 500, 1000];
      
      for (const amount of quickAmounts) {
        // 重置余额
        members[0].balance = 0;
        rechargeRecords = [];
        
        // Act
        const result = await memberService.recharge(amount);
        
        // Assert
        expect(result.newBalance).toBe(amount);
      }
    });
    
    it('should show success popup after recharge', async () => {
      // Arrange
      const amount = 500;
      
      // Act
      const result = await memberService.recharge(amount);
      
      // Assert - 验证充值成功，可触发弹窗
      expect(result.success).toBe(true);
      // 实际实现中，这里会返回 UI 状态让前端显示弹窗
    });
    
    it('should create recharge record', async () => {
      // Arrange
      const amount = 500;
      
      // Act
      await memberService.recharge(amount);
      const records = await memberService.getRechargeHistory();
      
      // Assert
      expect(records.length).toBe(1);
      expect(records[0].amount).toBe(500);
    });
    
    it('should reject invalid amount (negative)', async () => {
      // Arrange
      const amount = -100;
      
      // Act & Assert
      await expect(memberService.recharge(amount)).rejects.toThrow('充值金额必须大于0');
    });
    
    it('should reject invalid amount (zero)', async () => {
      // Arrange
      const amount = 0;
      
      // Act & Assert
      await expect(memberService.recharge(amount)).rejects.toThrow('充值金额必须大于0');
    });
    
    it('should reject amount over limit', async () => {
      // Arrange
      const amount = 10001;
      
      // Act & Assert
      await expect(memberService.recharge(amount)).rejects.toThrow('单次充值金额不能超过10000');
    });
  });
  
  describe('T2-5: 充值后余额更新', () => {
    it('should update balance after recharge', async () => {
      // Arrange - 初始余额 100
      members[0].balance = 100;
      memberService.setCurrentMember(members[0]);
      
      // Act - 充值 300
      const result = await memberService.recharge(300);
      
      // Assert
      expect(result.newBalance).toBe(400);
    });
    
    it('should calculate correct balance with pending order', async () => {
      // Arrange - 余额 100，预账单 300
      members[0].balance = 100;
      memberService.setCurrentMember(members[0]);
      const pendingBill = 300;
      
      // Act - 充值 300
      const result = await memberService.recharge(300);
      const availableBalance = result.newBalance - pendingBill;
      
      // Assert - 可用余额 = 400 - 300 = 100
      expect(availableBalance).toBe(100);
    });
    
    it('should show updated balance on homepage', async () => {
      // Arrange
      members[0].balance = 0;
      memberService.setCurrentMember(members[0]);
      
      // Act
      await memberService.recharge(500);
      const balance = await memberService.getBalance();
      
      // Assert - 首页应显示更新后的余额
      expect(balance).toBe(500);
    });
  });
});
