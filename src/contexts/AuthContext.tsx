'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types
export interface Member {
  id: number;
  name: string;
  phone: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  member: Member | null;
  token: string | null;
  isLoading: boolean;
  login: (phone: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  recharge: (amount: number) => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时从 localStorage 恢复登录状态
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setToken(storedToken);
        setMember(user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // 登录
  const login = useCallback(async (phone: string, name?: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name }),
    });
    
    const data = await res.json();
    
    if (data.code !== 0) {
      throw new Error(data.message || '登录失败');
    }
    
    const { token: newToken, member: newMember } = data.data;
    
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newMember));
    
    setToken(newToken);
    setMember(newMember);
    
    return newMember;
  }, []);

  // 登出
  const logout = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setMember(null);
  }, []);

  // 充值
  const recharge = useCallback(async (amount: number) => {
    if (!token) throw new Error('未登录');
    
    const res = await fetch('/api/v1/auth/recharge', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });
    
    const data = await res.json();
    
    if (data.code !== 0) {
      throw new Error(data.message || '充值失败');
    }
    
    // 更新本地会员信息
    setMember(prev => prev ? { ...prev, balance: data.data.balance } : null);
    localStorage.setItem(USER_KEY, JSON.stringify({ ...member, balance: data.data.balance }));
  }, [token, member]);

  // 刷新会员信息
  const refreshMember = useCallback(async () => {
    if (!token) return;
    
    const res = await fetch('/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    const data = await res.json();
    
    if (data.code === 0 && data.data) {
      setMember(data.data);
      localStorage.setItem(USER_KEY, JSON.stringify(data.data));
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ member, token, isLoading, login, logout, recharge, refreshMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
