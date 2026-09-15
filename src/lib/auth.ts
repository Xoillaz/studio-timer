import { NextRequest } from 'next/server';

/**
 * 从请求中提取会员 ID
 * 简单的 token 验证（实际应该用 JWT）
 */
export function getMemberIdFromToken(request: NextRequest): number | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  // 解析 token 格式: member_{id}_{timestamp}_{random}
  const parts = token.split('_');
  if (parts.length < 2 || parts[0] !== 'member') {
    return null;
  }
  
  const memberId = parseInt(parts[1], 10);
  if (isNaN(memberId)) {
    return null;
  }
  
  return memberId;
}

/**
 * 从请求中提取管理员 ID
 */
export function getAdminIdFromToken(request: NextRequest): number | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  // 解析 token 格式: admin_{id}_{timestamp}_{random}
  const parts = token.split('_');
  if (parts.length < 2 || parts[0] !== 'admin') {
    return null;
  }
  
  const adminId = parseInt(parts[1], 10);
  if (isNaN(adminId)) {
    return null;
  }
  
  return adminId;
}

/**
 * 生成会员 token
 */
export function generateMemberToken(memberId: number): string {
  return `member_${memberId}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

/**
 * 生成管理员 token
 */
export function generateAdminToken(adminId: number): string {
  return `admin_${adminId}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}
