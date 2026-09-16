import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized, error, ErrorCodes } from '@/lib/api-response';
import { getAdminIdFromToken } from '@/lib/admin-auth';

// 手动放行
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminId = getAdminIdFromToken(request);
    if (!adminId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const orderId = parseInt(params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { member: true, venue: true },
    });

    if (!order) {
      return NextResponse.json(error(ErrorCodes.ORDER_NOT_FOUND, '订单不存在'));
    }

    // 计算费用并扣款
    let finalAmount = order.baseAmount || 0;

    if (order.entryTime) {
      const minutes = Math.floor((Date.now() - new Date(order.entryTime).getTime()) / 60000);
      const billingUnits = Math.ceil(minutes / 30);
      finalAmount = billingUnits * (order.venue.pricePerHour / 2);
    }

    if (order.member.balance < finalAmount) {
      return NextResponse.json(error(ErrorCodes.INSUFFICIENT_BALANCE, '会员余额不足'));
    }

    // 扣款并完成订单
    await prisma.member.update({
      where: { id: order.memberId },
      data: { balance: { decrement: finalAmount } },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'completed',
        exitTime: new Date(),
        finalAmount,
      },
    });

    return NextResponse.json(success({ message: '放行成功', finalAmount }));
  } catch (err) {
    console.error('Release error:', err);
    return NextResponse.json(unauthorized('操作失败'));
  }
}
