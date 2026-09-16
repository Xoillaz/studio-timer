import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized, error, ErrorCodes } from '@/lib/api-response';
import { getAdminIdFromToken } from '@/lib/admin-auth';

// 审核操作
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
    if (isNaN(orderId)) {
      return NextResponse.json(error(ErrorCodes.PARAM_ERROR, '无效的订单ID'));
    }

    const body = await request.json();
    const { action, extraAmount, remark } = body; // action: approve | reject | adjust

    // 获取订单
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        member: true,
        venue: true,
      },
    });

    if (!order) {
      return NextResponse.json(error(ErrorCodes.ORDER_NOT_FOUND, '订单不存在'));
    }

    // 基础费用
    let finalAmount = order.baseAmount || 0;

    // 根据订单状态处理
    if (order.status === 'reviewing') {
      // 离场审核
      if (action === 'approve') {
        // 计算最终费用
        if (order.entryTime) {
          const minutes = Math.floor(
            (Date.now() - new Date(order.entryTime).getTime()) / 60000
          );
          const billingUnits = Math.ceil(minutes / 30);
          const venueFee = billingUnits * (order.venue.pricePerHour / 2);
          finalAmount = venueFee + (extraAmount || 0);
        }

        // 扣款
        if (order.member.balance >= finalAmount) {
          await prisma.member.update({
            where: { id: order.memberId },
            data: {
              balance: { decrement: finalAmount },
            },
          });

          // 更新订单状态为已完成
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'completed',
              exitTime: new Date(),
              durationMinutes: order.entryTime
                ? Math.floor((Date.now() - new Date(order.entryTime).getTime()) / 60000)
                : 0,
              extraAmount: extraAmount || 0,
              finalAmount,
              remark,
            },
          });

          // 创建审核记录
          await prisma.adminApproval.create({
            data: {
              orderId,
              adminId,
              action: 'approved',
              afterAmount: finalAmount,
              reason: remark,
            },
          });

          return NextResponse.json(success({ message: '审核通过，已扣款' }));
        } else {
          return NextResponse.json(
            error(ErrorCodes.INSUFFICIENT_BALANCE, '会员余额不足')
          );
        }
      } else if (action === 'reject') {
        // 拒绝离场
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'active' },
        });

        await prisma.adminApproval.create({
          data: {
            orderId,
            adminId,
            action: 'rejected',
            reason: remark,
          },
        });

        return NextResponse.json(success({ message: '已拒绝离场申请' }));
      }
    } else if (order.status === 'topup_pending') {
      // 账单审核（调价）
      if (action === 'approve') {
        finalAmount = (extraAmount || 0);

        if (order.member.balance >= finalAmount) {
          await prisma.member.update({
            where: { id: order.memberId },
            data: { balance: { decrement: finalAmount } },
          });

          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'completed',
              finalAmount,
              extraAmount: extraAmount || 0,
              remark,
            },
          });

          await prisma.adminApproval.create({
            data: {
              orderId,
              adminId,
              action: 'approved',
              afterAmount: finalAmount,
              reason: remark,
            },
          });

          return NextResponse.json(success({ message: '账单审核通过' }));
        } else {
          return NextResponse.json(
            error(ErrorCodes.INSUFFICIENT_BALANCE, '会员余额不足')
          );
        }
      } else if (action === 'reject') {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'entering', remark },
        });

        await prisma.adminApproval.create({
          data: {
            orderId,
            adminId,
            action: 'rejected',
            reason: remark,
          },
        });

        return NextResponse.json(success({ message: '已拒绝账单' }));
      }
    }

    return NextResponse.json(error(ErrorCodes.ORDER_STATUS_ERROR, '订单状态不允许此操作'));
  } catch (err) {
    console.error('Approve error:', err);
    return NextResponse.json(unauthorized('操作失败'));
  }
}

// 获取订单详情（管理员）
export async function GET(
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
      include: {
        member: { select: { id: true, name: true, phone: true, balance: true } },
        venue: true,
      },
    });

    if (!order) {
      return NextResponse.json(error(ErrorCodes.ORDER_NOT_FOUND, '订单不存在'));
    }

    return NextResponse.json(success(order));
  } catch (err) {
    console.error('Get order error:', err);
    return NextResponse.json(unauthorized('获取失败'));
  }
}
