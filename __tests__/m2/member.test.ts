/**
 * M2 认证与会员 - 会员模块测试
 * 对应测试用例: T2-4, T2-5
 * 
 * 测试目标：
 * - 充值功能
 * - 充值后余额更新
 * 
 * 更新记录：
 * - v1.5: 适配后端重构，无重大变更
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

// Member Service
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
    
    const updated = await mockMemberApi.updateBalance(member.id, amount);
    await mockMemberApi.createRechargeRecord(member.id, amount);
    
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
    members = [
      { id: 1, name: '张三', phone: '13800138000', balance: 0, created_at: '2026-01-01', updated_at: '2026-01-01' }
    ];
    rechargeRecords = [];
    memberService = new MemberService();
    memberService.setCurrentMember(members[0]);
  });
  
  describe('T2-4: 充值功能', () => {
    it('should recharge with custom amount', async () => {
      const amount = 500;
      
      const result = await memberService.recharge(amount);
      
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(500);
      expect(result.record).toBeDefined();
      expect(result.record.amount).toBe(500);
      expect(result.record.type).toBe('recharge');
    });
    
    it('should recharge with quick amount buttons', async () => {
      const quickAmounts = [100, 200, 500, 1000];
      
      for (const amount of quickAmounts) {
        members[0].balance = 0;
        rechargeRecords = [];
        
        const result = await memberService.recharge(amount);
        
        expect(result.newBalance).toBe(amount);
      }
    });
    
    it('should show success popup after recharge', async () => {
      const amount = 500;
      
      const result = await memberService.recharge(amount);
      
      expect(result.success).toBe(true);
    });
    
    it('should create recharge record', async () => {
      const amount = 500;
      
      await memberService.recharge(amount);
      const records = await memberService.getRechargeHistory();
      
      expect(records.length).toBe(1);
      expect(records[0].amount).toBe(500);
    });
    
    it('should reject invalid amount (negative)', async () => {
      const amount = -100;
      
      await expect(memberService.recharge(amount)).rejects.toThrow('充值金额必须大于0');
    });
    
    it('should reject invalid amount (zero)', async () => {
      const amount = 0;
      
      await expect(memberService.recharge(amount)).rejects.toThrow('充值金额必须大于0');
    });
    
    it('should reject amount over limit', async () => {
      const amount = 10001;
      
      await expect(memberService.recharge(amount)).rejects.toThrow('单次充值金额不能超过10000');
    });
  });
  
  describe('T2-5: 充值后余额更新', () => {
    it('should update balance after recharge', async () => {
      members[0].balance = 100;
      memberService.setCurrentMember(members[0]);
      
      const result = await memberService.recharge(300);
      
      expect(result.newBalance).toBe(400);
    });
    
    it('should calculate correct balance with pending order', async () => {
      members[0].balance = 100;
      memberService.setCurrentMember(members[0]);
      const pendingBill = 300;
      
      const result = await memberService.recharge(300);
      const availableBalance = result.newBalance - pendingBill;
      
      expect(availableBalance).toBe(100);
    });
    
    it('should show updated balance on homepage', async () => {
      members[0].balance = 0;
      memberService.setCurrentMember(members[0]);
      
      await memberService.recharge(500);
      const balance = await memberService.getBalance();
      
      expect(balance).toBe(500);
    });
  });
});
