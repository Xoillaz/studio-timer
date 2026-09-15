import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, paramError, error, ErrorCodes } from '@/lib/api-response';

// 生成简单的 token（实际应该用 JWT）
function generateToken(memberId: number): string {
  return `member_${memberId}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

// 会员登录（模拟微信授权）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name } = body;

    // 参数校验
    if (!phone || !name) {
      return NextResponse.json(paramError('请输入姓名和手机号'));
    }

    // 查找或创建会员
    let member = await prisma.member.findUnique({
      where: { phone },
    });

    if (!member) {
      // 新用户注册
      member = await prisma.member.create({
        data: {
          name,
          phone,
          balance: 0,
        },
      });
    }

    // 生成 token
    const token = generateToken(member.id);

    return NextResponse.json(success({
      token,
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
        balance: member.balance,
      },
    }));
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(error(ErrorCodes.INTERNAL_ERROR, '登录失败，请稍后重试'));
  }
}
