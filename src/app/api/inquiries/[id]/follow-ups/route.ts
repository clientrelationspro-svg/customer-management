import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// GET: 获取定时跟进列表
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const followUps = await prisma.scheduledFollowUp.findMany({
      where: { inquiryId: params.id },
      orderBy: { scheduledAt: 'asc' },
    });
    return NextResponse.json({ success: true, data: followUps });
  } catch {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// POST: 添加定时跟进
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { subject, body: emailBody, scheduledAt, customerId } = body;

    if (!subject?.trim() || !emailBody?.trim() || !scheduledAt) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    const count = await prisma.scheduledFollowUp.count({ where: { inquiryId: params.id } });
    const followUp = await prisma.scheduledFollowUp.create({
      data: {
        inquiryId: params.id,
        customerId: customerId || null,
        subject: subject.trim(),
        body: emailBody.trim(),
        scheduledAt: new Date(scheduledAt),
        sortOrder: count,
      },
    });

    return NextResponse.json({ success: true, data: followUp }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
