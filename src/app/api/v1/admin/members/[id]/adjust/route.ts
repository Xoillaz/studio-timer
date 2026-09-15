import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized, error, ErrorCodes } from '@/lib/api-response';
import { getAdminIdFromToken } from '@/lib/admin-auth';

// 调整会员余额
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminId = getAdminIdFromToken(request);
    if (!adminId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const memberId = parseInt(params.id);
    if (isNaN(memberId)) {
      return NextResponse.json(error(ErrorCodes.PARAM_ERROR, '无效的会员ID'));
    }

    const body = await request.json();
    const { amount } = body;

    if (typeof amount !== 'number') {
      return NextResponse.json(error(ErrorCodes.PARAM_ERROR, '无效的金额'));
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json(error(ErrorCodes.USER_NOT_FOUND, '会员不存在'));
    }

    // 调整余额
    const newBalance = member.balance + amount;
    if (newBalance < 0) {
      return NextResponse.json(error(ErrorCodes.PARAM_ERROR, '余额不足'));
    }

    await prisma.member.update({
      where: { id: memberId },
      data: { balance: newBalance },
    });

    return NextResponse.json(success({ balance: newBalance }));
  } catch (err) {
    console.error('Adjust balance error:', err);
    return NextResponse.json(unauthorized('操作失败'));
  }
}
