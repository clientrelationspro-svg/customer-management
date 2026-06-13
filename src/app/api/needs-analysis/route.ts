import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 确保表存在
async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS customer_needs (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        style TEXT,
        priority INTEGER DEFAULT 0,
        source TEXT DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    // 表已存在
  }
}

// GET - 获取需求列表
export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const category = searchParams.get('category');

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (category) where.category = category;

    const needs = await prisma.customerNeed.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: needs });
  } catch (error) {
    console.error('Error fetching needs:', error);
    return NextResponse.json({ success: false, error: '获取需求数据失败' }, { status: 500 });
  }
}

// POST - 创建需求
export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const body = await request.json();
    const { customerId, category, content, style, priority, source } = body;

    if (!customerId || !category || !content) {
      return NextResponse.json({ success: false, error: 'customerId, category, content 为必填' }, { status: 400 });
    }

    if (!['product_requirement', 'cooperation_angle', 'hook'].includes(category)) {
      return NextResponse.json({ success: false, error: 'category 必须为 product_requirement / cooperation_angle / hook' }, { status: 400 });
    }

    const need = await prisma.customerNeed.create({
      data: {
        customerId,
        category,
        content,
        style: style || null,
        priority: priority || 0,
        source: source || 'manual',
      },
    });

    return NextResponse.json({ success: true, data: need });
  } catch (error) {
    console.error('Error creating need:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}
