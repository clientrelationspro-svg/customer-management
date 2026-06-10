import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 获取客户的跟进话术列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: '缺少 customerId 参数' }, { status: 400 });
    }

    const scripts = await prisma.$queryRaw<any[]>`
      SELECT * FROM follow_up_scripts
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
    `;

    const formatted = scripts.map(s => ({
      id: s.id,
      customerId: s.customer_id,
      type: s.type,
      title: s.title,
      content: s.content,
      lastSentAt: s.last_sent_at,
      nextFollowUpDate: s.next_follow_up_date,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return NextResponse.json({ error: '获取话术失败' }, { status: 500 });
  }
}

// 创建跟进话术
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, type, title, content } = body;

    if (!customerId || !type || !title || !content) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    if (!['whatsapp', 'email', 'phone'].includes(type)) {
      return NextResponse.json({ error: '无效的话术类型' }, { status: 400 });
    }

    const id = `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await prisma.$executeRaw`
      INSERT INTO follow_up_scripts (id, customer_id, type, title, content, created_at, updated_at)
      VALUES (${id}, ${customerId}, ${type}, ${title}, ${content}, ${now}, ${now})
    `;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM follow_up_scripts WHERE id = ${id} LIMIT 1
    `;

    const s = rows[0];
    return NextResponse.json({
      id: s.id, customerId: s.customer_id, type: s.type,
      title: s.title, content: s.content,
      lastSentAt: s.last_sent_at, nextFollowUpDate: s.next_follow_up_date,
      createdAt: s.created_at, updatedAt: s.updated_at,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating script:', error);
    return NextResponse.json({ error: '创建话术失败' }, { status: 500 });
  }
}
