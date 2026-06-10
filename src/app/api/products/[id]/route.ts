import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

// 获取单个产品
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { 
        supplier: true,
        orderItems: {
          include: { order: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// 更新产品
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const {
      name,
      sku,
      description,
      price,
      cost,
      stock,
      minStock,
      category,
      status,
      supplierId,
    } = body;
    
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(sku && { sku }),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(cost !== undefined && { cost: cost ? parseFloat(cost) : null }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(minStock !== undefined && { minStock: parseInt(minStock) }),
        ...(category !== undefined && { category }),
        ...(status && { status }),
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
      },
    });
    
    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Error updating product:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// 删除产品
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await prisma.product.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
