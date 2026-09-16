import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized } from '@/lib/api-response';
import { getMemberIdFromToken } from '@/lib/auth';

// 获取会员订单列表
export async function GET(request: NextRequest) {
  try {
    const memberId = getMemberIdFromToken(request);
    if (!memberId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');

    const where: Record<string, unknown> = { memberId };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          venue: {
            select: { name: true },
          },
          orderVasServices: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json(success({
      items: orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        venueName: order.venue.name,
        entryTime: order.entryTime ? new Date(order.entryTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
        exitTime: order.exitTime ? new Date(order.exitTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
        durationMinutes: order.durationMinutes,
        baseAmount: order.baseAmount,
        vasAmount: order.orderVasServices.reduce((sum, ov) => sum + ov.subtotal, 0),
        finalAmount: order.finalAmount,
      })),
      total,
      page,
      pageSize,
    }));
  } catch (err) {
    console.error('Get orders error:', err);
    return NextResponse.json(success({ items: [], total: 0 }));
  }
}

// 创建订单
export async function POST(request: NextRequest) {
  try {
    const memberId = getMemberIdFromToken(request);
    if (!memberId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const body = await request.json();
    const { venueId, equipmentIds } = body;

    if (!venueId) {
      return NextResponse.json(unauthorized('请选择场地'));
    }

    // 生成订单号
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 创建订单
    const order = await prisma.order.create({
      data: {
        orderNo,
        memberId,
        venueId,
        status: 'pending_entry',
      },
    });

    // 如果有设备，添加设备关联
    if (equipmentIds && equipmentIds.length > 0) {
      const equipmentPrices = await prisma.equipment.findMany({
        where: { id: { in: equipmentIds } },
        select: { id: true, pricePerUse: true },
      });

      const orderEquipments = equipmentIds.map((equipmentId: number) => {
        const equipment = equipmentPrices.find((e) => e.id === equipmentId);
        return {
          orderId: order.id,
          equipmentId,
          quantity: 1,
          subtotal: equipment?.pricePerUse || 0,
        };
      });

      await prisma.orderEquipment.createMany({
        data: orderEquipments,
      });
    }

    return NextResponse.json(success({ orderId: order.id, orderNo: order.orderNo }), { status: 201 });
  } catch (err) {
    console.error('Create order error:', err);
    return NextResponse.json(unauthorized('创建订单失败'));
  }
}
