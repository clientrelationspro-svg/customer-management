import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { followUpId, nextFollowUpDate } = body;
    const now = new Date().toISOString();

    // 更新话术发送时间
    await prisma.followUpScript.update({
      where: { id: params.id },
      data: {
        lastSentAt: now,
        ...(nextFollowUpDate && { nextFollowUpDate: new Date(nextFollowUpDate) }),
      },
    });

    // 获取话术
    const script = await prisma.followUpScript.findUnique({
      where: { id: params.id },
    });

    const effectiveNextDate = nextFollowUpDate || script?.nextFollowUpDate?.toISOString().split('T')[0] || null;

    // 更新跟进记录日期
    if (followUpId) {
      const updateData: any = { lastFollowUpDate: now };
      if (effectiveNextDate) {
        updateData.nextFollowUpDate = new Date(effectiveNextDate);
      }
      await prisma.followUp.update({
        where: { id: followUpId },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true, sentAt: now });
  } catch (error) {
    console.error('Error sending script:', error);
    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }
}
