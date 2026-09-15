import { NextRequest } from 'next/server';

/**
 * 从 token 中提取管理员 ID
 * @param request NextRequest 对象
 * @returns 管理员 ID，如果无效返回 null
 */
export function getAdminIdFromToken(request: NextRequest): number | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  // 解析 admin token: admin_{adminId}_{timestamp}_{random}
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
 * 验证管理员 token
 * @param request NextRequest 对象
 * @returns 是否有效
 */
export function validateAdminToken(request: NextRequest): boolean {
  return getAdminIdFromToken(request) !== null;
}
