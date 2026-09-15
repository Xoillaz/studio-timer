import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized, error, ErrorCodes } from '@/lib/api-response';

// 简单密码验证（生产环境应使用 bcrypt）
function verifyPassword(inputPassword: string): boolean {
  // 简单比较，生产环境用 bcrypt
  // 预计算的哈希：admin123
  return inputPassword === 'admin123';
}

// 生成简单的 admin token
function generateAdminToken(adminId: number): string {
  return `admin_${adminId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

// 管理员登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(error(ErrorCodes.PARAM_ERROR, '用户名和密码不能为空'));
    }

    // 查找管理员
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return NextResponse.json(unauthorized('用户名或密码错误'));
    }

    // 验证密码
    if (!verifyPassword(password)) {
      return NextResponse.json(unauthorized('用户名或密码错误'));
    }

    // 生成 token
    const token = generateAdminToken(admin.id);

    return NextResponse.json(success({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        realName: admin.realName,
        role: admin.role,
      }
    }));
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json(error(ErrorCodes.INTERNAL_ERROR, '登录失败'));
  }
}
