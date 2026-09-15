import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized } from '@/lib/api-response';
import { getAdminIdFromToken } from '@/lib/admin-auth';

// 获取会员列表
export async function GET(request: NextRequest) {
  try {
    const adminId = getAdminIdFromToken(request);
    if (!adminId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const members = await prisma.member.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        createdAt: true,
      },
    });

    return NextResponse.json(success(members));
  } catch (err) {
    console.error('Members error:', err);
    return NextResponse.json(unauthorized('获取失败'));
  }
}
