import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenPayload } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = getTokenPayload();
    if (!payload) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const skill = await prisma.userSkill.findUnique({ where: { id: params.id } });
    if (!skill || skill.userId !== payload.userId) {
      return NextResponse.json({ success: false, error: '无权操作' }, { status: 403 });
    }

    const body = await request.json();
    const updated = await prisma.userSkill.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.workflow !== undefined && { workflow: body.workflow }),
        ...(body.goals !== undefined && { goals: body.goals }),
        ...(body.tips !== undefined && { tips: body.tips }),
        ...(body.tools !== undefined && { tools: body.tools }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = getTokenPayload();
    if (!payload) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const skill = await prisma.userSkill.findUnique({ where: { id: params.id } });
    if (!skill || skill.userId !== payload.userId) {
      return NextResponse.json({ success: false, error: '无权操作' }, { status: 403 });
    }

    await prisma.userSkill.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
