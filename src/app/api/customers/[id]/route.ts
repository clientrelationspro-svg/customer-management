import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取单个客户
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        contacts: true,
        keyContact: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        files: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: '客户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { success: false, error: '获取客户信息失败' },
      { status: 500 }
    );
  }
}

// 更新客户
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      companyName,
      enterpriseScale,
      country,
      establishDate,
      address,
      regCapital,
      industry,
      employeeCount,
      notes,
      phone,
      fax,
      website,
      email,
      socialMedia,
      contactAddress,
      keyContactId,
      status,
    } = body;

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(companyName !== undefined && { companyName }),
        ...(enterpriseScale !== undefined && { enterpriseScale }),
        ...(country !== undefined && { country }),
        ...(establishDate !== undefined && { 
          establishDate: establishDate ? new Date(establishDate) : null 
        }),
        ...(address !== undefined && { address }),
        ...(regCapital !== undefined && { regCapital }),
        ...(industry !== undefined && { industry }),
        ...(employeeCount !== undefined && { 
          employeeCount: employeeCount ? parseInt(employeeCount) : null 
        }),
        ...(notes !== undefined && { notes }),
        ...(phone !== undefined && { phone }),
        ...(fax !== undefined && { fax }),
        ...(website !== undefined && { website }),
        ...(email !== undefined && { email }),
        ...(socialMedia !== undefined && { socialMedia }),
        ...(contactAddress !== undefined && { contactAddress }),
        ...(keyContactId !== undefined && { keyContactId: keyContactId || null }),
        ...(status !== undefined && { status }),
      },
      include: {
        contacts: true,
      },
    });

    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '邮箱已存在' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: '更新客户失败' },
      { status: 500 }
    );
  }
}

// 删除客户
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.customer.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: '客户删除成功' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: '客户不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: '删除客户失败' },
      { status: 500 }
    );
  }
}
