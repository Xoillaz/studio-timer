import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized, error, ErrorCodes } from '@/lib/api-response';
import { getMemberIdFromToken } from '@/lib/auth';

// 扫码入场
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const memberId = getMemberIdFromToken(request);
    if (!memberId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json(error(ErrorCodes.PARAM_ERROR, '缺少订单ID'));
    }

    const orderIdNum = parseInt(orderId);
    if (isNaN(orderIdNum)) {
      return NextResponse.json(error(ErrorCodes.PARAM_ERROR, '订单ID无效'));
    }

    // 查询订单
    const order = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        memberId,
      },
      include: {
        venue: true,
      },
    });

    if (!order) {
      return NextResponse.json(error(ErrorCodes.ORDER_NOT_FOUND, '订单不存在'));
    }

    if (order.status !== 'pending') {
      return NextResponse.json(error(ErrorCodes.ORDER_STATUS_ERROR, '订单状态不允许入场'));
    }

    // 更新订单状态为进行中，记录入场时间
    const updatedOrder = await prisma.order.update({
      where: { id: orderIdNum },
      data: {
        status: 'active',
        entryTime: new Date(),
      },
      include: {
        venue: true,
      },
    });

    return NextResponse.json(success({
      order: {
        id: updatedOrder.id,
        orderNo: updatedOrder.orderNo,
        status: updatedOrder.status,
        venueName: updatedOrder.venue.name,
        entryTime: updatedOrder.entryTime ? new Date(updatedOrder.entryTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
        venuePricePerHour: updatedOrder.venue.pricePerHour,
      },
    }));
  } catch (err) {
    console.error('Entry error:', err);
    return NextResponse.json(error(ErrorCodes.INTERNAL_ERROR, '入场失败，请稍后重试'));
  }
}
