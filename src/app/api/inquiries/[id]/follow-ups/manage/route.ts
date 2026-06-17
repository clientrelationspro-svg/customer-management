import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// PATCH: 更新定时跟进
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const followUpId = searchParams.get('id');
    if (!followUpId) return NextResponse.json({ error: '缺少ID' }, { status: 400 });

    const body = await request.json();
    const data: any = {};
    if (body.subject) data.subject = body.subject;
    if (body.body !== undefined) data.body = body.body;
    if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt);

    const fu = await prisma.scheduledFollowUp.update({ where: { id: followUpId }, data });
    return NextResponse.json({ success: true, data: fu });
  } catch {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE: 删除定时跟进
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const followUpId = searchParams.get('id');
    if (!followUpId) return NextResponse.json({ error: '缺少ID' }, { status: 400 });

    await prisma.scheduledFollowUp.delete({ where: { id: followUpId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
