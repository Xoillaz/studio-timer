import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized, error, ErrorCodes } from '@/lib/api-response';
import { getMemberIdFromToken } from '@/lib/auth';

// 扫码入场
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
        orderEquipments: {
          include: {
            equipment: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(error(ErrorCodes.ORDER_NOT_FOUND, '订单不存在'));
    }

    if (order.status !== 'pending_entry') {
      return NextResponse.json(error(ErrorCodes.ORDER_STATUS_ERROR, '订单状态不允许入场'));
    }

    // 检查余额是否足够支付入场费（设备费用）
    const equipmentTotal = order.orderEquipments.reduce(
      (sum, oe) => sum + oe.subtotal,
      0
    );

    if (order.member.balance < equipmentTotal) {
      return NextResponse.json(
        error(ErrorCodes.INSUFFICIENT_BALANCE, '余额不足，请先充值'),
        { status: 400 }
      );
    }

    // 扣减设备费用
    await prisma.member.update({
      where: { id: memberId },
      data: {
        balance: {
          decrement: equipmentTotal,
        },
      },
    });

    // 更新订单状态为入场中
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'entering',
        entryTime: new Date(),
      },
      include: {
        venue: true,
        orderEquipments: {
          include: {
            equipment: true,
          },
        },
      },
    });

    return NextResponse.json(success({
      order: {
        id: updatedOrder.id,
        orderNo: updatedOrder.orderNo,
        status: updatedOrder.status,
        venueName: updatedOrder.venue.name,
        entryTime: updatedOrder.entryTime?.toISOString(),
        baseAmount: updatedOrder.baseAmount,
        finalAmount: updatedOrder.finalAmount,
        equipmentTotal,
        equipments: updatedOrder.orderEquipments.map(oe => ({
          name: oe.equipment.name,
          pricePerUse: oe.equipment.pricePerUse,
          quantity: oe.quantity,
          subtotal: oe.subtotal,
        })),
      },
    }));
  } catch (err) {
    console.error('Entry error:', err);
    return NextResponse.json(error(ErrorCodes.INTERNAL_ERROR, '入场失败，请稍后重试'));
  }
}
