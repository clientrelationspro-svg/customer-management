import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 记录话术发送，同步更新跟进记录的上次跟进日期
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { followUpId, nextFollowUpDate } = body;
    const now = new Date().toISOString();

    // 1. 更新话术的发送时间
    await prisma.$executeRaw`
      UPDATE follow_up_scripts
      SET last_sent_at = ${now}, updated_at = ${now}
      WHERE id = ${params.id}
    `;

    // 2. 获取话术的 customer_id 和 next_follow_up_date
    const scripts = await prisma.$queryRaw<any[]>`
      SELECT customer_id, next_follow_up_date FROM follow_up_scripts WHERE id = ${params.id} LIMIT 1
    `;

    if (!scripts[0]) {
      return NextResponse.json({ error: '话术不存在' }, { status: 404 });
    }

    const script = scripts[0];
    const effectiveNextDate = nextFollowUpDate || script.next_follow_up_date;

    // 3. 如果提供了 followUpId，更新跟进记录的上次跟进日期和下次跟进日期
    if (followUpId) {
      if (effectiveNextDate) {
        await prisma.$executeRaw`
          UPDATE follow_ups
          SET last_follow_up_date = ${now},
              next_follow_up_date = ${effectiveNextDate},
              updated_at = ${now}
          WHERE id = ${followUpId}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE follow_ups
          SET last_follow_up_date = ${now},
              updated_at = ${now}
          WHERE id = ${followUpId}
        `;
      }
    }

    // 4. 如果传了下次跟进日期，同步更新话术记录
    if (nextFollowUpDate) {
      await prisma.$executeRaw`
        UPDATE follow_up_scripts
        SET next_follow_up_date = ${nextFollowUpDate}
        WHERE id = ${params.id}
      `;
    }

    return NextResponse.json({ success: true, sentAt: now });
  } catch (error) {
    console.error('Error sending script:', error);
    return NextResponse.json({ error: '发送记录失败' }, { status: 500 });
  }
}
