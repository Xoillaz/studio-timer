import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized } from '@/lib/api-response';
import { getAdminIdFromToken } from '@/lib/admin-auth';

// 获取管理员仪表盘数据
export async function GET(request: NextRequest) {
  try {
    const adminId = getAdminIdFromToken(request);
    if (!adminId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    // 待审核数量（reviewing 和 topup_pending 状态）
    const pendingCount = await prisma.order.count({
      where: {
        status: { in: ['reviewing', 'topup_pending'] },
      },
    });

    // 今日订单数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await prisma.order.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // 今日收入（已完成的订单）
    const todayRevenue = await prisma.order.aggregate({
      where: {
        status: 'completed',
        exitTime: { gte: today },
      },
      _sum: {
        finalAmount: true,
      },
    });

    // 活跃会员数（有进行中订单的会员）
    const activeMembers = await prisma.member.count({
      where: {
        orders: {
          some: {
            status: 'active',
          },
        },
      },
    });

    return NextResponse.json(success({
      pendingCount,
      todayOrders,
      todayRevenue: todayRevenue._sum.finalAmount || 0,
      activeMembers,
    }));
  } catch (err) {
    console.error('Dashboard error:', err);
    return NextResponse.json(unauthorized('获取数据失败'));
  }
}
