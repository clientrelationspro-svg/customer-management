import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 更新联系人
export async function PATCH(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const body = await request.json();
    const { name, position, email, whatsapp, phone, remarks } = body;

    // 获取联系人以获取 customerId
    const existingContact = await prisma.contact.findUnique({
      where: { id: params.contactId },
      select: { customerId: true },
    });

    if (!existingContact) {
      return NextResponse.json(
        { success: false, error: '联系人不存在' },
        { status: 404 }
      );
    }

    // 更新联系人并更新客户的 updatedAt
    const [contact] = await prisma.$transaction([
      prisma.contact.update({
        where: { id: params.contactId },
        data: {
          ...(name !== undefined && { name }),
          ...(position !== undefined && { position }),
          ...(email !== undefined && { email }),
          ...(whatsapp !== undefined && { whatsapp }),
          ...(phone !== undefined && { phone }),
          ...(remarks !== undefined && { remarks }),
        },
      }),
      prisma.customer.update({
        where: { id: existingContact.customerId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, data: contact });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: '联系人不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: '更新联系人失败' },
      { status: 500 }
    );
  }
}

// 删除联系人
export async function DELETE(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    // 获取联系人以获取 customerId
    const existingContact = await prisma.contact.findUnique({
      where: { id: params.contactId },
      select: { customerId: true },
    });

    if (!existingContact) {
      return NextResponse.json(
        { success: false, error: '联系人不存在' },
        { status: 404 }
      );
    }

    // 删除联系人并更新客户的 updatedAt
    await prisma.$transaction([
      prisma.contact.delete({
        where: { id: params.contactId },
      }),
      prisma.customer.update({
        where: { id: existingContact.customerId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, message: '联系人删除成功' });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: '联系人不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: '删除联系人失败' },
      { status: 500 }
    );
  }
}
