import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized } from '@/lib/api-response';
import { getAdminIdFromToken } from '@/lib/admin-auth';

// 获取待审核订单列表
export async function GET(request: NextRequest) {
  try {
    const adminId = getAdminIdFromToken(request);
    if (!adminId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // reviewing, topup_pending

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['reviewing', 'topup_pending'] };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        member: {
          select: { id: true, name: true, phone: true },
        },
        venue: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 计算每个订单的当前费用
    const ordersWithCurrentAmount = await Promise.all(
      orders.map(async (order) => {
        let currentAmount = 0;
        if (order.entryTime && order.status === 'active') {
          const minutes = Math.floor(
            (Date.now() - new Date(order.entryTime).getTime()) / 60000
          );
          const billingUnits = Math.ceil(minutes / 30);
          currentAmount = billingUnits * (order.venue.pricePerHour / 2);
        }

        return {
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          memberId: order.member.id,
          memberName: order.member.name,
          memberPhone: order.member.phone,
          venueName: order.venue.name,
          venuePricePerHour: order.venue.pricePerHour,
          entryTime: order.entryTime?.toISOString(),
          exitTime: order.exitTime?.toISOString(),
          durationMinutes: order.durationMinutes,
          baseAmount: order.baseAmount,
          extraAmount: order.extraAmount,
          finalAmount: order.finalAmount,
          currentAmount: Math.round(currentAmount * 100) / 100,
          createdAt: order.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json(success(ordersWithCurrentAmount));
  } catch (err) {
    console.error('Pending orders error:', err);
    return NextResponse.json(unauthorized('获取数据失败'));
  }
}
