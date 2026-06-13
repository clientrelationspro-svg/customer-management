import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getTokenPayload, requireAdmin } from '@/lib/auth';

// PATCH - 编辑用户（管理员）
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = getTokenPayload();
    if (!requireAdmin(payload)) {
      return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
    }

    const body = await request.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email.toLowerCase().trim();
    if (body.role !== undefined) data.role = body.role;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.company !== undefined) data.company = body.company || null;
    if (body.contact !== undefined) data.contact = body.contact || null;
    if (body.password) data.password = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.update({ where: { id: params.id }, data,
      select: { id: true, email: true, name: true, role: true, description: true, company: true, contact: true, createdAt: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

// DELETE - 删除用户（管理员，不能删除自己）
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = getTokenPayload();
    if (!requireAdmin(payload)) {
      return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
    }
    if (payload!.userId === params.id) {
      return NextResponse.json({ success: false, error: '不能删除自己' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: '用户已删除' });
  } catch {
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
