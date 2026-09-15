import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { success, forbidden, paramError } from '@/lib/api-response';
import { getAdminIdFromToken } from '@/lib/auth';

// 获取场地列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');
    
    const where: Record<string, unknown> = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    
    const venues = await prisma.venue.findMany({
      where,
      orderBy: { id: 'asc' },
    });
    
    return NextResponse.json(success({
      items: venues,
      total: venues.length,
    }));
  } catch (err) {
    console.error('Get venues error:', err);
    return NextResponse.json(success({ items: [], total: 0 }));
  }
}

// 创建场地
export async function POST(request: NextRequest) {
  try {
    // 简单验证：需要管理员 token
    const adminId = getAdminIdFromToken(request);
    if (!adminId) {
      return NextResponse.json(forbidden('只有管理员可以创建场地'));
    }
    
    const body = await request.json();
    const { name, pricePerHour, description, isActive = true } = body;
    
    if (!name || !pricePerHour) {
      return NextResponse.json(paramError('请填写场地名称和价格'));
    }
    
    const venue = await prisma.venue.create({
      data: {
        name,
        pricePerHour: parseFloat(pricePerHour),
        description,
        isActive,
      },
    });
    
    return NextResponse.json(success(venue), { status: 201 });
  } catch (err) {
    console.error('Create venue error:', err);
    return NextResponse.json(forbidden('创建失败'));
  }
}
