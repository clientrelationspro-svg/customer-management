import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

// 获取单个跟进记录
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT f.*, c.company_name as customer_name, ct.name as contact_name,
             ct.phone as contact_phone, ct.email as contact_email, ct.whatsapp as contact_whatsapp
      FROM follow_ups f
      LEFT JOIN customers c ON f.customer_id = c.id
      LEFT JOIN contacts ct ON f.contact_id = ct.id
      WHERE f.id = ${params.id}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: '跟进记录不存在' }, { status: 404 });
    }

    const result = {
      ...formatRow(row),
      customer: row.customer_name ? { id: row.customer_id, companyName: row.customer_name } : null,
      contact: row.contact_name ? {
        id: row.contact_id,
        name: row.contact_name,
        phone: row.contact_phone,
        email: row.contact_email,
        whatsapp: row.contact_whatsapp,
      } : null,
    };

    return NextResponse.json(result);
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
    const now = new Date().toISOString();

    // 先获取现有记录
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM follow_ups WHERE id = ${params.id} LIMIT 1
    `;
    if (!existing[0]) {
      return NextResponse.json({ error: '跟进记录不存在' }, { status: 404 });
    }

    const current = existing[0];

    // 构建更新值（使用已有值作为默认值）
    const customerId = body.customerId ?? current.customer_id;
    const contactId = body.contactId !== undefined ? body.contactId || null : current.contact_id;
    const phone = body.phone !== undefined ? body.phone || null : current.phone;
    const whatsapp = body.whatsapp !== undefined ? body.whatsapp || null : current.whatsapp;
    const email = body.email !== undefined ? body.email || null : current.email;
    const followUpMatters = body.followUpMatters !== undefined
      ? (Array.isArray(body.followUpMatters) ? body.followUpMatters.join(',') : body.followUpMatters)
      : current.follow_up_matters;
    const contactMethod = body.contactMethod ?? current.contact_method;
    const nextAction = body.nextAction !== undefined ? body.nextAction || null : current.next_action;
    const priority = body.priority ?? current.priority;
    const status = body.status ?? current.status;
    const lastFollowUpDate = body.lastFollowUpDate
      ? new Date(body.lastFollowUpDate).toISOString()
      : current.last_follow_up_date;
    const nextFollowUpDate = body.nextFollowUpDate !== undefined
      ? (body.nextFollowUpDate ? new Date(body.nextFollowUpDate).toISOString() : null)
      : current.next_follow_up_date;
    const remarks = body.remarks !== undefined ? body.remarks || null : current.remarks;

    await prisma.$executeRaw`
      UPDATE follow_ups SET
        customer_id = ${customerId},
        contact_id = ${contactId},
        phone = ${phone},
        whatsapp = ${whatsapp},
        email = ${email},
        follow_up_matters = ${followUpMatters},
        contact_method = ${contactMethod},
        next_action = ${nextAction},
        priority = ${priority},
        status = ${status},
        last_follow_up_date = ${lastFollowUpDate},
        next_follow_up_date = ${nextFollowUpDate},
        remarks = ${remarks},
        updated_at = ${now}
      WHERE id = ${params.id}
    `;

    // 返回更新后的记录
    const rows = await prisma.$queryRaw<any[]>`
      SELECT f.*, c.company_name as customer_name, ct.name as contact_name
      FROM follow_ups f
      LEFT JOIN customers c ON f.customer_id = c.id
      LEFT JOIN contacts ct ON f.contact_id = ct.id
      WHERE f.id = ${params.id}
      LIMIT 1
    `;

    const row = rows[0];
    const result = {
      ...formatRow(row),
      customer: row.customer_name ? { id: row.customer_id, companyName: row.customer_name } : null,
      contact: row.contact_name ? { id: row.contact_id, name: row.contact_name } : null,
    };

    return NextResponse.json(result);
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
    await prisma.$executeRaw`DELETE FROM follow_ups WHERE id = ${params.id}`;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/follow-ups/[id]:', error);
    return NextResponse.json({ error: '删除跟进记录失败' }, { status: 500 });
  }
}
