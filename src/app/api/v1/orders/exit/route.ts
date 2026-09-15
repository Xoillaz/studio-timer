import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized, error, ErrorCodes } from '@/lib/api-response';
import { getMemberIdFromToken } from '@/lib/auth';

// 申请离场
export async function POST(request: NextRequest) {
  try {
    const memberId = getMemberIdFromToken(request);
    if (!memberId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(error(ErrorCodes.PARAM_ERROR, '缺少订单ID'));
    }

    // 查询订单
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        memberId,
      },
      include: {
        venue: true,
        member: true,
      },
    });

    if (!order) {
      return NextResponse.json(error(ErrorCodes.ORDER_NOT_FOUND, '订单不存在'));
    }

    if (order.status !== 'entering') {
      return NextResponse.json(error(ErrorCodes.ORDER_STATUS_ERROR, '订单状态不允许离场'));
    }

    // 计算费用
    const exitTime = new Date();
    const entryTime = order.entryTime!;
    const durationMs = exitTime.getTime() - entryTime.getTime();
    const durationMinutes = Math.ceil(durationMs / 60000);
    
    // 半小时起步，不足半小时按半小时计
    const billableMinutes = Math.max(30, durationMinutes);
    const baseAmount = (billableMinutes / 60) * order.venue.pricePerHour;

    // 检查余额是否足够
    if (order.member.balance < baseAmount) {
      return NextResponse.json(
        error(ErrorCodes.INSUFFICIENT_BALANCE, '余额不足，请先充值', {
          required: (baseAmount - order.member.balance).toFixed(2),
          current: order.member.balance,
        }),
        { status: 400 }
      );
    }

    // 扣减余额
    await prisma.member.update({
      where: { id: memberId },
      data: {
        balance: {
          decrement: baseAmount,
        },
      },
    });

    // 更新订单状态为待审核
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'pending_exit',
        exitTime,
        durationMinutes,
        baseAmount,
        finalAmount: baseAmount + order.extraAmount,
      },
    });

    return NextResponse.json(success({
      order: {
        id: updatedOrder.id,
        orderNo: updatedOrder.orderNo,
        status: updatedOrder.status,
        durationMinutes: updatedOrder.durationMinutes,
        baseAmount: updatedOrder.baseAmount,
        finalAmount: updatedOrder.finalAmount,
      },
    }));
  } catch (err) {
    console.error('Exit error:', err);
    return NextResponse.json(error(ErrorCodes.INTERNAL_ERROR, '申请离场失败，请稍后重试'));
  }
}
