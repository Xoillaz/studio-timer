import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemberIdFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const memberId = getMemberIdFromToken(request);
    if (!memberId) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    // 查找当前进行中的订单
    const order = await prisma.order.findFirst({
      where: {
        memberId,
        status: 'entering',
      },
      include: {
        venue: true,
        orderEquipments: {
          include: {
            equipment: true,
          },
        },
      },
      orderBy: {
        entryTime: 'desc',
      },
    });

    if (!order) {
      return NextResponse.json({ code: 0, data: null });
    }

    // 计算当前金额
    const now = new Date();
    const entryTime = new Date(order.entryTime!);
    const minutes = Math.floor((now.getTime() - entryTime.getTime()) / 60000);
    const hours = Math.ceil(minutes / 30) * 0.5; // 半小时起算
    const baseAmount = hours * order.venue.pricePerHour;
    const equipmentTotal = order.orderEquipments.reduce(
      (sum, oe) => sum + (oe.equipment?.pricePerUse || 0),
      0
    );
    const currentAmount = baseAmount + equipmentTotal;

    return NextResponse.json({
      code: 0,
      data: {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        venueName: order.venue.name,
        venuePricePerHour: order.venue.pricePerHour,
        entryTime: order.entryTime,
        durationMinutes: minutes,
        currentAmount,
        extraAmount: order.extraAmount || 0,
        finalAmount: order.finalAmount,
      },
    });
  } catch (error) {
    console.error('Get active order error:', error);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
