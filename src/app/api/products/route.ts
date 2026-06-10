import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取产品列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { description: { contains: search } },
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    if (status) {
      where.status = status;
    }
    
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true },
      }),
      prisma.product.count({ where }),
    ]);
    
    return NextResponse.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// 创建产品
export async function POST(request: NextRequest) {
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
    
    if (!name || !sku || !price) {
      return NextResponse.json(
        { error: 'Name, SKU and price are required' },
        { status: 400 }
      );
    }
    
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        description,
        price: parseFloat(price),
        cost: cost ? parseFloat(cost) : null,
        stock: parseInt(stock) || 0,
        minStock: parseInt(minStock) || 0,
        category,
        status: status || 'active',
        supplierId: supplierId || null,
      },
    });
    
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
