import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// PATCH: 更新联系人
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    if (!contactId) return NextResponse.json({ error: '缺少联系人ID' }, { status: 400 });

    const body = await request.json();
    const contact = await prisma.supplierContact.update({
      where: { id: contactId },
      data: {
        name: body.name?.trim(),
        position: body.position ?? undefined,
        phone: body.phone ?? undefined,
        whatsapp: body.whatsapp ?? undefined,
        email: body.email ?? undefined,
        wechat: body.wechat ?? undefined,
        decisionWeight: body.decisionWeight ?? undefined,
        communicationPreference: body.communicationPreference ?? undefined,
        timezone: body.timezone ?? undefined,
        remarks: body.remarks ?? undefined,
      },
    });
    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    return NextResponse.json({ error: '更新联系人失败' }, { status: 500 });
  }
}

// DELETE: 删除联系人
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    if (!contactId) return NextResponse.json({ error: '缺少联系人ID' }, { status: 400 });

    await prisma.supplierContact.delete({ where: { id: contactId } });
    return NextResponse.json({ success: true, message: '联系人删除成功' });
  } catch (error) {
    return NextResponse.json({ error: '删除联系人失败' }, { status: 500 });
  }
}
