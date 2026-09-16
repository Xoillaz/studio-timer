import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized, notFound, paramError } from '@/lib/api-response';
import { getMemberIdFromToken } from '@/lib/auth';

// 增值服务下单
export async function POST(request: NextRequest) {
  try {
    const memberId = getMemberIdFromToken(request);
    if (!memberId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const body = await request.json();
    const { orderId, items } = body;

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(paramError('参数错误'));
    }

    // 验证订单属于当前用户且处于进行中状态
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        memberId,
        status: 'entering',
      },
    });

    if (!order) {
      return NextResponse.json(notFound('订单不存在或状态不允许'));
    }

    // 获取增值服务信息
    const vasServiceIds = items.map((item: any) => item.vasServiceId);
    const vasServices = await prisma.vasService.findMany({
      where: { id: { in: vasServiceIds } },
    });

    // 处理每一项增值服务：每次都新增记录
    for (const item of items) {
      const vasService = vasServices.find(v => v.id === item.vasServiceId);
      if (!vasService) continue;

      // 每次都新增，不合并
      await prisma.orderVasService.create({
        data: {
          orderId,
          vasServiceId: item.vasServiceId,
          quantity: item.quantity,
          subtotal: item.quantity * vasService.pricePerUse,
        },
      });
    }

    // 获取更新后的增值服务列表
    const orderVasServices = await prisma.orderVasService.findMany({
      where: { orderId },
      include: { vasService: true },
    });

    const vasServiceTotal = orderVasServices.reduce((sum, ov) => sum + ov.subtotal, 0);

    return NextResponse.json(success({
      vasServices: orderVasServices.map(ov => ({
        name: ov.vasService.name,
        pricePerUse: ov.vasService.pricePerUse,
        quantity: ov.quantity,
        subtotal: ov.subtotal,
        createdAt: ov.createdAt ? new Date(ov.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
      })),
      vasServiceTotal,
    }));
  } catch (err) {
    console.error('Add vas service error:', err);
    return NextResponse.json(paramError('添加增值服务失败'));
  }
}
