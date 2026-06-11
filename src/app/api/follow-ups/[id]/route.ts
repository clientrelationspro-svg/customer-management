import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// 获取单个跟进记录
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const followUp = await prisma.followUp.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { id: true, companyName: true } },
        contact: true,
      },
    });

    if (!followUp) {
      return NextResponse.json({ error: '跟进记录不存在' }, { status: 404 });
    }

    return NextResponse.json(followUp);
  } catch (error) {
    console.error('Error in GET /api/follow-ups/[id]:', error);
    return NextResponse.json({ error: '获取跟进记录失败' }, { status: 500 });
  }
}

// 更新跟进记录
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      customerId, contactId, phone, whatsapp, email,
      followUpMatters, contactMethod, nextAction, priority, status,
      lastFollowUpDate, nextFollowUpDate, remarks,
    } = body;

    const data: any = {};
    if (customerId !== undefined) data.customerId = customerId;
    if (contactId !== undefined) data.contactId = contactId || null;
    if (phone !== undefined) data.phone = phone || null;
    if (whatsapp !== undefined) data.whatsapp = whatsapp || null;
    if (email !== undefined) data.email = email || null;
    if (followUpMatters !== undefined) {
      data.followUpMatters = Array.isArray(followUpMatters) ? followUpMatters.join(',') : followUpMatters;
    }
    if (contactMethod !== undefined) data.contactMethod = contactMethod;
    if (nextAction !== undefined) data.nextAction = nextAction || null;
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) data.status = status;
    if (lastFollowUpDate !== undefined) data.lastFollowUpDate = new Date(lastFollowUpDate);
    if (nextFollowUpDate !== undefined) data.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
    if (remarks !== undefined) data.remarks = remarks || null;

    const followUp = await prisma.followUp.update({
      where: { id: params.id },
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(followUp);
  } catch (error) {
    console.error('Error in PATCH /api/follow-ups/[id]:', error);
    return NextResponse.json({ error: '更新跟进记录失败' }, { status: 500 });
  }
}

// 删除跟进记录
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.followUp.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/follow-ups/[id]:', error);
    return NextResponse.json({ error: '删除跟进记录失败' }, { status: 500 });
  }
}
