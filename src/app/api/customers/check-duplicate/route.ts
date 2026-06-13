import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// 强制动态渲染，因为使用了request.url
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get('companyName');
    const excludeId = searchParams.get('excludeId'); // 编辑时排除当前客户
    
    if (!companyName) {
      return NextResponse.json(
        { success: false, error: '公司名称不能为空' },
        { status: 400 }
      );
    }
    
    const where: any = {
      companyName: {
        equals: companyName,
      },
    };
    
    // 编辑时排除当前客户ID
    if (excludeId) {
      where.id = { not: excludeId };
    }
    
    const existingCustomer = await prisma.customer.findFirst({
      where,
    });
    
    return NextResponse.json({
      success: true,
      exists: !!existingCustomer,
      message: existingCustomer ? '该公司名称已存在' : '公司名称可用',
    });
  } catch (error) {
    console.error('Error checking company name duplicate:', error);
    return NextResponse.json(
      { success: false, error: '检查公司名称失败' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
