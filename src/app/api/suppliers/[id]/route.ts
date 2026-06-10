import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

// 获取单个供应商
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        products: {
          orderBy: { createdAt: 'desc' },
        },
        files: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

// 更新供应商
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { name, email, phone, company, address, contactPerson, status, notes } = body;
    
    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        ...(address !== undefined && { address }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    });
    
    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

// 删除供应商
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await prisma.supplier.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ message: 'Supplier deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete supplier with associated products' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
