import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 格式转换
function formatRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id,
    contactId: row.contact_id,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    followUpMatters: row.follow_up_matters,
    contactMethod: row.contact_method,
    nextAction: row.next_action,
    priority: row.priority,
    status: row.status,
    lastFollowUpDate: row.last_follow_up_date,
    nextFollowUpDate: row.next_follow_up_date,
    remarks: row.remarks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// 获取跟进列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // 获取所有跟进记录（包含关联客户和联系人信息）
    const allFollowUps = await prisma.$queryRaw<any[]>`
      SELECT 
        f.*,
        c.company_name as customer_name,
        ct.name as contact_name
      FROM follow_ups f
      LEFT JOIN customers c ON f.customer_id = c.id
      LEFT JOIN contacts ct ON f.contact_id = ct.id
      ORDER BY f.next_follow_up_date ASC
    `;

    // 在 JS 中过滤
    let filtered = allFollowUps.map(row => ({
      ...formatRow(row)!,
      customer: row.customer_name ? { id: row.customer_id, companyName: row.customer_name } : null,
      contact: row.contact_name ? { id: row.contact_id, name: row.contact_name } : null,
    }));

    if (customerId) {
      filtered = filtered.filter(f => f.customerId === customerId);
    }
    if (status) {
      filtered = filtered.filter(f => f.status === status);
    }
    if (priority) {
      filtered = filtered.filter(f => f.priority === priority);
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      data: paged,
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

    const id = `fup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const matters = Array.isArray(followUpMatters) ? followUpMatters.join(',') : followUpMatters;
    const now = new Date().toISOString();

    await prisma.$executeRaw`
      INSERT INTO follow_ups (id, customer_id, contact_id, phone, whatsapp, email, follow_up_matters, contact_method, next_action, priority, status, last_follow_up_date, next_follow_up_date, remarks, created_at, updated_at)
      VALUES (
        ${id}, ${customerId}, ${contactId || null}, ${phone || null}, ${whatsapp || null}, ${email || null},
        ${matters}, ${contactMethod}, ${nextAction || null}, ${priority || 'medium'}, ${status || 'in_progress'},
        ${new Date(lastFollowUpDate).toISOString()}, ${nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null},
        ${remarks || null}, ${now}, ${now}
      )
    `;

    // 返回创建的记录
    const rows = await prisma.$queryRaw<any[]>`
      SELECT f.*, c.company_name as customer_name
      FROM follow_ups f LEFT JOIN customers c ON f.customer_id = c.id
      WHERE f.id = ${id} LIMIT 1
    `;

    const row = rows[0];
    const result = {
      ...formatRow(row),
      customer: row.customer_name ? { id: row.customer_id, companyName: row.customer_name } : null,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/follow-ups:', error);
    return NextResponse.json({ error: '创建跟进记录失败' }, { status: 500 });
  }
}
