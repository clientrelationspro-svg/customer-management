import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// GET: 获取沟通记录
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const communications = await prisma.supplierCommunication.findMany({
      where: { supplierId: params.id },
      orderBy: { createdAt: 'desc' },
      include: { contact: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ success: true, data: communications });
  } catch (error) {
    return NextResponse.json({ error: '获取沟通记录失败' }, { status: 500 });
  }
}

// POST: 新增沟通记录
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (!body.content?.trim()) {
      return NextResponse.json({ error: '沟通内容不能为空' }, { status: 400 });
    }
    const comm = await prisma.supplierCommunication.create({
      data: {
        supplierId: params.id,
        contactId: body.contactId || null,
        method: body.method || 'other',
        content: body.content.trim(),
      },
      include: { contact: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ success: true, data: comm }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '创建沟通记录失败' }, { status: 500 });
  }
}
