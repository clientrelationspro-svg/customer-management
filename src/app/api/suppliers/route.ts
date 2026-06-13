import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET: 获取供应商列表（支持搜索、筛选、排序、分页）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const cooperationStatus = searchParams.get('cooperationStatus') || '';
    const riskLevel = searchParams.get('riskLevel') || '';
    const country = searchParams.get('country') || '';
    const product = searchParams.get('product') || '';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const starred = searchParams.get('starred');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
        { mainProducts: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (cooperationStatus) where.cooperationStatus = cooperationStatus;
    if (riskLevel) where.riskLevel = riskLevel;
    if (country) where.country = country;
    if (product) where.mainProducts = { contains: product, mode: 'insensitive' };
    if (starred === 'true') where.isStarred = true;

    const orderBy: any = {};
    if (sortBy === 'riskLevel') {
      // 自定义排序：high > medium > low
      orderBy.riskLevel = sortOrder;
    } else if (sortBy === 'orderAmount') {
      orderBy.orderAmount = sortOrder;
    } else {
      orderBy.updatedAt = sortOrder;
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contacts: { select: { id: true, name: true } },
          _count: { select: { riskEvents: true } },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: suppliers, total, page, limit });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ success: false, error: '获取供应商列表失败' }, { status: 500 });
  }
}

// POST: 创建供应商
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, website, address, country, mainProducts, cooperationStatus,
      riskLevel, riskTypes, riskDescription, foundedDate, orderAmount, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: '公司名称不能为空' }, { status: 400 });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
      }
      const existing = await prisma.supplier.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: '该邮箱已存在' }, { status: 400 });
      }
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        country: country || null,
        mainProducts: mainProducts || null,
        cooperationStatus: cooperationStatus || 'potential',
        riskLevel: riskLevel || null,
        riskTypes: riskTypes || null,
        riskDescription: riskDescription || null,
        foundedDate: foundedDate ? new Date(foundedDate) : null,
        orderAmount: orderAmount ? parseFloat(orderAmount) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, data: supplier }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: '该邮箱已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: '创建供应商失败' }, { status: 500 });
  }
}
