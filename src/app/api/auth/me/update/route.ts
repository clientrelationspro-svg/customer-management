import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

  const body = await request.json();
  const data: any = {};

  if (body.businessRole) data.businessRole = body.businessRole;
  if (body.name !== undefined) data.name = body.name || null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.company !== undefined) data.company = body.company || null;
  if (body.contact !== undefined) data.contact = body.contact || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ success: false, error: '无更新内容' }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({
    success: true,
    data: {
      name: updated.name,
      businessRole: updated.businessRole,
      description: updated.description,
      company: updated.company,
      contact: updated.contact,
    },
  });
}
