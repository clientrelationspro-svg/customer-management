import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// GET: 获取风险事件
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const events = await prisma.supplierRiskEvent.findMany({
      where: { supplierId: params.id },
      orderBy: { occurredAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    return NextResponse.json({ error: '获取风险事件失败' }, { status: 500 });
  }
}

// POST: 新增风险事件
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (!body.description?.trim()) {
      return NextResponse.json({ error: '风险描述不能为空' }, { status: 400 });
    }
    const event = await prisma.supplierRiskEvent.create({
      data: {
        supplierId: params.id,
        riskType: body.riskType || '其他',
        description: body.description.trim(),
        severity: body.severity || 'medium',
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : null,
      },
    });
    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '创建风险事件失败' }, { status: 500 });
  }
}
