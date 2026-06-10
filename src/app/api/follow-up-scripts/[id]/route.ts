import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 更新话术
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { type, title, content } = body;
    const now = new Date().toISOString();

    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM follow_up_scripts WHERE id = ${params.id} LIMIT 1
    `;
    if (!existing[0]) {
      return NextResponse.json({ error: '话术不存在' }, { status: 404 });
    }

    await prisma.$executeRaw`
      UPDATE follow_up_scripts SET
        type = ${type ?? existing[0].type},
        title = ${title ?? existing[0].title},
        content = ${content ?? existing[0].content},
        updated_at = ${now}
      WHERE id = ${params.id}
    `;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM follow_up_scripts WHERE id = ${params.id} LIMIT 1
    `;
    const s = rows[0];
    return NextResponse.json({
      id: s.id, customerId: s.customer_id, type: s.type,
      title: s.title, content: s.content,
      createdAt: s.created_at, updatedAt: s.updated_at,
    });
  } catch (error) {
    console.error('Error updating script:', error);
    return NextResponse.json({ error: '更新话术失败' }, { status: 500 });
  }
}

// 删除话术（或标记完成并删除）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.$executeRaw`DELETE FROM follow_up_scripts WHERE id = ${params.id}`;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting script:', error);
    return NextResponse.json({ error: '删除话术失败' }, { status: 500 });
  }
}
