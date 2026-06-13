import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// GET: 获取供应商联系人列表
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const contacts = await prisma.supplierContact.findMany({
      where: { supplierId: params.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    return NextResponse.json({ error: '获取联系人失败' }, { status: 500 });
  }
}

// POST: 新增供应商联系人
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: '姓名不能为空' }, { status: 400 });
    }
    const contact = await prisma.supplierContact.create({
      data: {
        supplierId: params.id,
        name: body.name.trim(),
        position: body.position || null,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        wechat: body.wechat || null,
        decisionWeight: body.decisionWeight || null,
        communicationPreference: body.communicationPreference || null,
        timezone: body.timezone || null,
        remarks: body.remarks || null,
      },
    });
    return NextResponse.json({ success: true, data: contact }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '创建联系人失败' }, { status: 500 });
  }
}
