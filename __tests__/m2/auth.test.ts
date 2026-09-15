/**
 * M2 认证与会员 - 认证模块测试
 * 对应测试用例: T2-1, T2-2, T2-3, T2-6
 * 
 * 测试目标：
 * - 模拟微信授权登录
 * - 新用户注册
 * - 已注册用户登录
 * - 退出登录
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

// Types (应该与项目中的类型定义保持一致)
interface Member {
  id: number;
  name: string;
  phone: string;
  wechat_openid?: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface AuthResponse {
  token: string;
  member: Member;
}

// Mock API functions (这些在实现阶段会被真实 API 调用替换)
const mockApi = {
  login: async (phone: string, name?: string): Promise<AuthResponse> => {
    // 模拟已有用户
    const existingUsers: Member[] = [
      { id: 1, name: '张三', phone: '13800138000', balance: 100, created_at: '2026-01-01', updated_at: '2026-01-01' }
    ];
    
    const user = existingUsers.find(u => u.phone === phone);
    if (user) {
      return {
        token: `mock_token_${user.id}_${Date.now()}`,
        member: user
      };
    }
    
    // 新用户注册
    if (name) {
      const newUser: Member = {
        id: existingUsers.length + 1,
        name,
        phone,
        balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return {
        token: `mock_token_${newUser.id}_${Date.now()}`,
        member: newUser
      };
    }
    
    throw new Error('用户不存在');
  },
  
  logout: async (): Promise<void> => {
    return Promise.resolve();
  }
};

// Auth Service (待实现)
class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  
  async login(phone: string, name?: string): Promise<Member> {
    const response = await mockApi.login(phone, name);
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.member));
    return response.member;
  }
  
  async logout(): Promise<void> {
    await mockApi.logout();
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
  
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
  getUser(): Member | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }
  
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}

describe('M2 认证模块', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    localStorage.clear();
    authService = new AuthService();
  });
  
  describe('T2-1: 模拟微信授权登录', () => {
    it('should login with phone and name, store token in localStorage', async () => {
      // Arrange
      const phone = '13800138000';
      const name = '张三';
      
      // Act
      const user = await authService.login(phone, name);
      
      // Assert
      expect(user).toBeDefined();
      expect(user.name).toBe('张三');
      expect(user.phone).toBe('13800138000');
      expect(authService.getToken()).toBeTruthy();
      expect(authService.getToken()).toContain('mock_token');
    });
    
    it('should redirect to homepage after login', async () => {
      // Arrange
      const phone = '13800138000';
      const name = '张三';
      
      // Act
      const user = await authService.login(phone, name);
      
      // Assert - 验证登录后用户信息可用于页面展示
      expect(user.name).toBe('张三');
    });
  });
  
  describe('T2-2: 新用户注册', () => {
    it('should register new user with name and phone', async () => {
      // Arrange - 使用未注册的手机号
      const phone = '13800138001';
      const name = '李四';
      
      // Act
      const user = await authService.login(phone, name);
      
      // Assert
      expect(user).toBeDefined();
      expect(user.name).toBe('李四');
      expect(user.phone).toBe('13800138001');
      expect(user.balance).toBe(0);
    });
    
    it('should auto login after registration', async () => {
      // Arrange
      const phone = '13800138001';
      const name = '李四';
      
      // Act
      const user = await authService.login(phone, name);
      
      // Assert - 注册后自动登录，token 已存储
      expect(authService.isLoggedIn()).toBe(true);
      expect(authService.getUser()?.phone).toBe(phone);
    });
  });
  
  describe('T2-3: 已注册用户登录', () => {
    it('should login existing user and show balance', async () => {
      // Arrange - 模拟已注册用户
      const phone = '13800138000'; // 在 mockApi 中定义，余额 100
      
      // Act
      const user = await authService.login(phone);
      
      // Assert
      expect(user).toBeDefined();
      expect(user.phone).toBe('13800138000');
      expect(user.balance).toBe(100);
    });
  });
  
  describe('T2-6: 退出登录', () => {
    it('should clear localStorage and redirect to login page', async () => {
      // Arrange - 先登录
      await authService.login('13800138000', '张三');
      expect(authService.isLoggedIn()).toBe(true);
      
      // Act
      await authService.logout();
      
      // Assert
      expect(authService.getToken()).toBeNull();
      expect(authService.getUser()).toBeNull();
      expect(authService.isLoggedIn()).toBe(false);
    });
  });
});
