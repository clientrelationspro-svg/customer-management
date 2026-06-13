import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取客户的所有联系人
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contacts = await prisma.contact.findMany({
      where: { customerId: params.id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { success: false, error: '获取联系人失败' },
      { status: 500 }
    );
  }
}

// 为客户创建联系人
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, position, email, whatsapp, phone, remarks } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '联系人姓名不能为空' },
        { status: 400 }
      );
    }

    // 创建联系人并更新客户的 updatedAt
    const [contact] = await prisma.$transaction([
      prisma.contact.create({
        data: {
          customerId: params.id,
          name,
          position,
          email,
          whatsapp,
          phone,
          remarks,
        },
      }),
      prisma.customer.update({
        where: { id: params.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { success: false, error: '创建联系人失败' },
      { status: 500 }
    );
  }
}
