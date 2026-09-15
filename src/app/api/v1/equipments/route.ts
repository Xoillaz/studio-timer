import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success } from '@/lib/api-response';

// 获取设备列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');
    
    const where: Record<string, unknown> = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    
    const equipments = await prisma.equipment.findMany({
      where,
      orderBy: { id: 'asc' },
    });
    
    return NextResponse.json(success({
      items: equipments,
      total: equipments.length,
    }));
  } catch (err) {
    console.error('Get equipments error:', err);
    return NextResponse.json(success({ items: [], total: 0 }));
  }
}
