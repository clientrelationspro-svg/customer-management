import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getTokenPayload } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// 获取跟进列表
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload();
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
    
    // 非管理员只看自己客户的跟进
    if (payload && payload.role !== 'admin') {
      where.customer = { userId: payload.userId };
    }

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
      success: true,
      data: followUps,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error in GET /api/follow-ups:', error);
    return NextResponse.json({ success: false, error: '获取跟进列表失败', data: [] }, { status: 500 });
  }
}

// 创建跟进记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId, companyName, contactId, phone, whatsapp, email,
      followUpMatters, contactMethod, nextAction, priority, status,
      lastFollowUpDate, nextFollowUpDate, remarks,
    } = body;

    let actualCustomerId = customerId;

    // 如果没有选择客户但输入了新公司名称，自动创建客户
    if (!actualCustomerId && companyName?.trim()) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { companyName: { equals: companyName.trim() } },
      });
      if (existingCustomer) {
        actualCustomerId = existingCustomer.id;
      } else {
        const newCustomer = await prisma.customer.create({
          data: {
            companyName: companyName.trim(),
            phone: phone || null,
            email: email || null,
            status: 'active',
          },
        });
        actualCustomerId = newCustomer.id;
      }
    }

    if (!actualCustomerId || !followUpMatters || !contactMethod || !lastFollowUpDate) {
      return NextResponse.json({ error: '缺少必填字段（客户或公司名称）' }, { status: 400 });
    }

    const matters = Array.isArray(followUpMatters) ? followUpMatters.join(',') : followUpMatters;

    const followUp = await prisma.followUp.create({
      data: {
        customerId: actualCustomerId,
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

    return NextResponse.json({ success: true, data: followUp }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/follow-ups:', error);
    return NextResponse.json(
      { success: false, error: '创建跟进记录失败，请确保已选择有效客户' }, 
      { status: 500 }
    );
  }
}
