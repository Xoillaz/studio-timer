import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized, notFound } from '@/lib/api-response';
import { getMemberIdFromToken } from '@/lib/auth';

// 获取订单详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const memberId = getMemberIdFromToken(request);
    if (!memberId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const { id: orderIdStr } = await params;
    const orderId = parseInt(orderIdStr);
    if (isNaN(orderId)) {
      return NextResponse.json(unauthorized('无效的订单ID'));
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        memberId,
      },
      include: {
        venue: true,
        member: {
          select: { name: true, phone: true },
        },
        orderVasServices: {
          include: {
            vasService: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json(notFound('订单不存在'));
    }

    // 计算当前费用：按半小时计费，不足半小时按半小时计，超过则向上舍入到0.5小时
    let currentAmount = 0;
    if (order.entryTime && order.status === 'active') {
      const minutes = Math.floor(
        (Date.now() - new Date(order.entryTime).getTime()) / 60000
      );
      // 计算计费单元数：向上舍入到0.5小时（即30分钟为一个单元）
      // 例如：20分钟=1单元，45分钟=2单元(1小时)，150分钟=5单元=2.5小时
      const billingUnits = Math.ceil(minutes / 30);
      // 每个单元30分钟，费用 = 单元数 * (每小时单价 / 2)
      currentAmount = billingUnits * (order.venue.pricePerHour / 2);
    }

    return NextResponse.json(success({
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      venueName: order.venue.name,
      venuePricePerHour: order.venue.pricePerHour,
      entryTime: order.entryTime ? new Date(order.entryTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
      exitTime: order.exitTime ? new Date(order.exitTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
      durationMinutes: order.durationMinutes,
      baseAmount: order.baseAmount,
      extraAmount: order.extraAmount,
      finalAmount: order.finalAmount,
      vasServiceTotal: order.orderVasServices.reduce((sum, ov) => sum + ov.subtotal, 0),
      vasServices: order.orderVasServices.map(ov => ({
        name: ov.vasService.name,
        pricePerUse: ov.vasService.pricePerUse,
        quantity: ov.quantity,
        subtotal: ov.subtotal,
        createdAt: new Date(ov.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      })),
      leaderName: order.leaderName,
      leaderPhone: order.leaderPhone,
      remark: order.remark,
      createdAt: new Date(order.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      currentAmount: Math.round(currentAmount * 100) / 100,
    }));
  } catch (err) {
    console.error('Get order error:', err);
    return NextResponse.json(notFound('获取订单详情失败'));
  }
}
