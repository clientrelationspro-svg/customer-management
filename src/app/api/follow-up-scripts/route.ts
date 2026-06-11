import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: '缺少 customerId 参数' }, { status: 400 });
    }

    const scripts = await prisma.followUpScript.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(scripts);
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return NextResponse.json({ error: '获取话术失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, type, title, content, nextFollowUpDate } = body;

    if (!customerId || !type || !title || !content) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const script = await prisma.followUpScript.create({
      data: {
        customerId,
        type,
        title,
        content,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      },
    });

    return NextResponse.json(script, { status: 201 });
  } catch (error) {
    console.error('Error creating script:', error);
    return NextResponse.json({ error: '创建话术失败' }, { status: 500 });
  }
}
