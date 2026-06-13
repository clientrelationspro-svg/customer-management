import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH - 更新需求
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { content, style, priority } = body;

    const need = await prisma.customerNeed.update({
      where: { id: params.id },
      data: {
        ...(content !== undefined && { content }),
        ...(style !== undefined && { style }),
        ...(priority !== undefined && { priority }),
      },
    });

    return NextResponse.json({ success: true, data: need });
  } catch (error) {
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

// DELETE - 删除需求
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.customerNeed.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
