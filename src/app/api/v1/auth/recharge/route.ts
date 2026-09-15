import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, paramError, error, ErrorCodes, unauthorized } from '@/lib/api-response';
import { getMemberIdFromToken } from '@/lib/auth';

// 会员充值（模拟）
export async function POST(request: NextRequest) {
  try {
    // 验证 token
    const memberId = getMemberIdFromToken(request);
    if (!memberId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const body = await request.json();
    const { amount } = body;

    // 参数校验
    if (!amount || amount <= 0) {
      return NextResponse.json(paramError('充值金额必须大于0'));
    }

    // 查询会员
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json(error(ErrorCodes.USER_NOT_FOUND, '会员不存在'));
    }

    // 更新余额
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: {
        balance: member.balance + amount,
      },
    });

    return NextResponse.json(success({
      balance: updatedMember.balance,
    }));
  } catch (err) {
    console.error('Recharge error:', err);
    return NextResponse.json(error(ErrorCodes.INTERNAL_ERROR, '充值失败，请稍后重试'));
  }
}
