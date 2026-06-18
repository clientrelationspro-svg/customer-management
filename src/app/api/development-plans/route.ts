import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) return NextResponse.json({ success: false, error: '缺少customerId' }, { status: 400 });
    const plan = await prisma.developmentPlan.findUnique({ where: { customerId } });
    return NextResponse.json({ success: true, data: plan });
  } catch { return NextResponse.json({ error: '获取失败' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, goal, steps } = body;
    const plan = await prisma.developmentPlan.create({ data: { customerId: String(customerId), goal: goal || '', steps: steps || '[]' } });
    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch { return NextResponse.json({ error: '创建失败' }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, goal, steps } = body;
    const plan = await prisma.developmentPlan.update({ where: { id }, data: { goal: goal || '', steps: steps || '[]' } });
    return NextResponse.json({ success: true, data: plan });
  } catch { return NextResponse.json({ error: '更新失败' }, { status: 500 }); }
}
