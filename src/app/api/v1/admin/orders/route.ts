import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized } from '@/lib/api-response';
import { getAdminIdFromToken } from '@/lib/admin-auth';

// 获取订单列表（管理员）
export async function GET(request: NextRequest) {
  try {
    const adminId = getAdminIdFromToken(request);
    if (!adminId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        member: { select: { name: true, phone: true } },
        venue: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = orders.map(order => ({
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      memberName: order.member.name,
      memberPhone: order.member.phone,
      venueName: order.venue.name,
      finalAmount: order.finalAmount,
      createdAt: order.createdAt.toISOString(),
    }));

    return NextResponse.json(success(result));
  } catch (err) {
    console.error('Orders error:', err);
    return NextResponse.json(unauthorized('获取失败'));
  }
}
