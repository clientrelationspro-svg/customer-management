import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { type, title, content, nextFollowUpDate } = body;

    const script = await prisma.followUpScript.update({
      where: { id: params.id },
      data: {
        ...(type && { type }),
        ...(title && { title }),
        ...(content && { content }),
        ...(nextFollowUpDate !== undefined && {
          nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        }),
      },
    });

    return NextResponse.json(script);
  } catch (error) {
    console.error('Error updating script:', error);
    return NextResponse.json({ error: '更新话术失败' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.followUpScript.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting script:', error);
    return NextResponse.json({ error: '删除话术失败' }, { status: 500 });
  }
}
