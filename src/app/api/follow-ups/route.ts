import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// 获取跟进列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [followUps, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          customer: { select: { id: true, companyName: true } },
          contact: { select: { id: true, name: true } },
        },
        orderBy: { nextFollowUpDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.followUp.count({ where }),
    ]);

    return NextResponse.json({
      data: followUps,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error in GET /api/follow-ups:', error);
    return NextResponse.json({ error: '获取跟进列表失败' }, { status: 500 });
  }
}

// 创建跟进记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId, contactId, phone, whatsapp, email,
      followUpMatters, contactMethod, nextAction, priority, status,
      lastFollowUpDate, nextFollowUpDate, remarks,
    } = body;

    if (!customerId || !followUpMatters || !contactMethod || !lastFollowUpDate) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const matters = Array.isArray(followUpMatters) ? followUpMatters.join(',') : followUpMatters;

    const followUp = await prisma.followUp.create({
      data: {
        customerId,
        contactId: contactId || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        followUpMatters: matters,
        contactMethod,
        nextAction: nextAction || null,
        priority: priority || 'medium',
        status: status || 'in_progress',
        lastFollowUpDate: new Date(lastFollowUpDate),
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        remarks: remarks || null,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(followUp, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/follow-ups:', error);
    return NextResponse.json({ error: '创建跟进记录失败' }, { status: 500 });
  }
}
