import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized } from '@/lib/api-response';
import { getMemberIdFromToken } from '@/lib/auth';

// 获取当前会员信息
export async function GET(request: NextRequest) {
  try {
    const memberId = getMemberIdFromToken(request);
    
    if (!memberId) {
      return NextResponse.json(unauthorized('请先登录'));
    }
    
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!member) {
      return NextResponse.json(unauthorized('会员不存在'));
    }
    
    return NextResponse.json(success({
      ...member,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    }));
  } catch (err) {
    console.error('Get member error:', err);
    return NextResponse.json(unauthorized('获取会员信息失败'));
  }
}
