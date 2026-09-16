import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized, notFound, paramError } from '@/lib/api-response';
import { getMemberIdFromToken } from '@/lib/auth';

interface VasServiceItem {
  vasServiceId: number;
  quantity: number;
}

// 增值服务下单
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
    const orderIdNum = parseInt(orderId);

    if (!orderId || isNaN(orderIdNum)) {
      return NextResponse.json(paramError('订单ID无效'));
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(paramError('参数错误'));
    }

    // 验证订单属于当前用户且处于进行中状态
    const order = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        memberId,
        status: 'active',
      },
    });

    if (!order) {
      return NextResponse.json(notFound('订单不存在或状态不允许'));
    }

    // 获取增值服务信息
    const vasServiceIds = items.map((item: VasServiceItem) => item.vasServiceId);
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
          orderId: orderIdNum,
          vasServiceId: item.vasServiceId,
          quantity: item.quantity,
          subtotal: item.quantity * vasService.pricePerUse,
        },
      });
    }

    // 获取更新后的增值服务列表
    const orderVasServices = await prisma.orderVasService.findMany({
      where: { orderId: orderIdNum },
      include: { vasService: true },
    });

    const vasServiceTotal = orderVasServices.reduce((sum, ov) => sum + ov.subtotal, 0);

    return NextResponse.json(success({
      services: orderVasServices.map(ov => ({
        id: ov.id,
        name: ov.vasService.name,
        pricePerUse: ov.vasService.pricePerUse,
        quantity: ov.quantity,
        subtotal: ov.subtotal,
        createdAt: ov.createdAt ? new Date(ov.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
      })),
      total: vasServiceTotal,
    }));
  } catch (err) {
    console.error('Add service error:', err);
    return NextResponse.json(paramError('添加增值服务失败'));
  }
}

// 获取订单的增值服务列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const memberId = getMemberIdFromToken(request);
    if (!memberId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const { id: orderId } = await params;
    const orderIdNum = parseInt(orderId);

    if (!orderId || isNaN(orderIdNum)) {
      return NextResponse.json(paramError('订单ID无效'));
    }

    // 验证订单属于当前用户
    const order = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        memberId,
      },
    });

    if (!order) {
      return NextResponse.json(notFound('订单不存在'));
    }

    // 获取增值服务列表
    const orderVasServices = await prisma.orderVasService.findMany({
      where: { orderId: orderIdNum },
      include: { vasService: true },
      orderBy: { createdAt: 'desc' },
    });

    const total = orderVasServices.reduce((sum, ov) => sum + ov.subtotal, 0);

    return NextResponse.json(success({
      items: orderVasServices.map(ov => ({
        id: ov.id,
        name: ov.vasService.name,
        pricePerUse: ov.vasService.pricePerUse,
        quantity: ov.quantity,
        subtotal: ov.subtotal,
        createdAt: ov.createdAt ? new Date(ov.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
      })),
      total,
    }));
  } catch (err) {
    console.error('Get services error:', err);
    return NextResponse.json(paramError('获取增值服务失败'));
  }
}
