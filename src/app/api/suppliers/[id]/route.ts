import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET: 获取单个供应商详情（含关联数据）
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        contacts: { orderBy: { createdAt: 'desc' } },
        communications: { orderBy: { createdAt: 'desc' }, include: { contact: { select: { id: true, name: true } } }, take: 50 },
        riskEvents: { orderBy: { occurredAt: 'desc' } },
        products: { select: { id: true, name: true, sku: true, price: true, stock: true } },
        files: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json({ error: '获取供应商详情失败' }, { status: 500 });
  }
}

// PATCH: 更新供应商
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { name, email, phone, website, address, country, mainProducts, cooperationStatus,
      riskLevel, riskTypes, riskDescription, foundedDate, orderAmount, isStarred, notes } = body;

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
      }
      const existing = await prisma.supplier.findFirst({
        where: { email, NOT: { id: params.id } },
      });
      if (existing) {
        return NextResponse.json({ error: '该邮箱已被其他供应商使用' }, { status: 400 });
      }
    }

    const data: any = {};
    if (name !== undefined) data.name = name?.trim();
    if (email !== undefined) data.email = email || null;
    if (phone !== undefined) data.phone = phone || null;
    if (website !== undefined) data.website = website || null;
    if (address !== undefined) data.address = address || null;
    if (country !== undefined) data.country = country || null;
    if (mainProducts !== undefined) data.mainProducts = mainProducts || null;
    if (cooperationStatus !== undefined) data.cooperationStatus = cooperationStatus;
    if (riskLevel !== undefined) data.riskLevel = riskLevel || null;
    if (riskTypes !== undefined) data.riskTypes = riskTypes || null;
    if (riskDescription !== undefined) data.riskDescription = riskDescription || null;
    if (foundedDate !== undefined) data.foundedDate = foundedDate ? new Date(foundedDate) : null;
    if (orderAmount !== undefined) data.orderAmount = orderAmount ? parseFloat(orderAmount) : null;
    if (isStarred !== undefined) data.isStarred = isStarred;
    if (notes !== undefined) data.notes = notes || null;

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ success: true, data: supplier });
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 });
    }
    return NextResponse.json({ error: '更新供应商失败' }, { status: 500 });
  }
}

// DELETE: 删除供应商
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productCount = await prisma.product.count({ where: { supplierId: params.id } });
    if (productCount > 0) {
      return NextResponse.json({ error: `无法删除：该供应商下有 ${productCount} 个关联产品` }, { status: 400 });
    }

    await prisma.supplier.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: '供应商删除成功' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 });
    }
    return NextResponse.json({ error: '删除供应商失败' }, { status: 500 });
  }
}
