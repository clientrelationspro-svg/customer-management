import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOrderNo } from '@/lib/utils';

// 获取订单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const customerId = searchParams.get('customerId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (customerId) {
      where.customerId = customerId;
    }
    
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.orderDate.lte = new Date(endDate);
      }
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);
    
    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// 创建订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      status,
      totalAmount,
      paidAmount,
      notes,
      deliveryDate,
      items,
    } = body;
    
    if (!customerId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Customer and items are required' },
        { status: 400 }
      );
    }
    
    // 验证客户是否存在
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    // 计算总金额
    let calculatedTotal = 0;
    for (const item of items) {
      calculatedTotal += item.quantity * item.unitPrice;
    }
    
    const order = await prisma.$transaction(async (tx) => {
      // 创建订单
      const newOrder = await tx.order.create({
        data: {
          orderNo: generateOrderNo(),
          customerId,
          status: status || 'pending',
          totalAmount: totalAmount || calculatedTotal,
          paidAmount: paidAmount || 0,
          notes,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        },
      });
      
      // 创建订单项
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          },
        });
        
        // 更新库存
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }
      
      return newOrder;
    });
    
    // 获取完整订单信息
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });
    
    return NextResponse.json(fullOrder, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Customer or product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
