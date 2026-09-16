import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取增值服务列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');
    
    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const services = await prisma.vasService.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        items: services,
        total: services.length,
      },
    });
  } catch (error) {
    console.error('获取增值服务列表失败:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      code: 500,
      message: '获取增值服务列表失败: ' + errMsg,
    }, { status: 500 });
  }
}
