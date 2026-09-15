import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, unauthorized } from '@/lib/api-response';
import { getAdminIdFromToken } from '@/lib/admin-auth';

// 获取操作日志
export async function GET(request: NextRequest) {
  try {
    const adminId = getAdminIdFromToken(request);
    if (!adminId) {
      return NextResponse.json(unauthorized('请先登录'));
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: Record<string, unknown> = {};
    if (orderId) {
      where.orderId = parseInt(orderId);
    }

    const logs = await prisma.operationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        admin: { select: { username: true, realName: true } },
      },
    });

    const result = logs.map(log => ({
      id: log.id,
      action: log.action,
      actionName: log.actionName,
      orderId: log.orderId,
      operatorType: log.operatorType,
      operatorId: log.operatorId,
      operatorName: log.operatorName || log.admin?.realName || log.admin?.username || '未知',
      details: log.details,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json(success(result));
  } catch (err) {
    console.error('Logs error:', err);
    return NextResponse.json(unauthorized('获取失败'));
  }
}
