import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取客户列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { email: { contains: search } },
        { address: { contains: search } },
        { industry: { contains: search } },
      ];
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          contacts: true,
          keyContact: true,
          _count: {
            select: { orders: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, error: '获取客户列表失败' },
      { status: 500 }
    );
  }
}

// 创建客户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      enterpriseScale,
      country,
      establishDate,
      address,
      regCapital,
      industry,
      employeeCount,
      notes,
      phone,
      fax,
      website,
      email,
      socialMedia,
      contactAddress,
      keyContactId,
      status,
      contacts,
    } = body;

    // 验证必填字段
    if (!companyName) {
      return NextResponse.json(
        { success: false, error: '公司名称不能为空' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        companyName,
        enterpriseScale,
        country,
        establishDate: establishDate ? new Date(establishDate) : null,
        address,
        regCapital,
        industry,
        employeeCount: employeeCount ? parseInt(employeeCount) : null,
        notes,
        phone,
        fax,
        website,
        email,
        socialMedia,
        contactAddress,
        keyContactId: keyContactId || null,
        status: status || 'active',
        contacts: contacts && contacts.length > 0 ? {
          create: contacts.map((contact: any) => ({
            name: contact.name,
            position: contact.position,
            email: contact.email,
            whatsapp: contact.whatsapp,
            phone: contact.phone,
            remarks: contact.remarks,
          })),
        } : undefined,
      },
      include: {
        contacts: true,
      },
    });

    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '邮箱已存在' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: '创建客户失败' },
      { status: 500 }
    );
  }
}
