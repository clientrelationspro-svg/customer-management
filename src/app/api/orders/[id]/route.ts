import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

// 获取单个订单
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        files: true,
      },
    });
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// 更新订单
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const {
      status,
      totalAmount,
      paidAmount,
      notes,
      deliveryDate,
    } = body;
    
    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(totalAmount !== undefined && { totalAmount: parseFloat(totalAmount) }),
        ...(paidAmount !== undefined && { paidAmount: parseFloat(paidAmount) }),
        ...(notes !== undefined && { notes }),
        ...(deliveryDate !== undefined && { 
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null 
        }),
      },
    });
    
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error updating order:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// 删除订单
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await prisma.$transaction(async (tx) => {
      // 获取订单项
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: params.id },
      });
      
      // 恢复库存
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }
      
      // 删除订单项
      await tx.orderItem.deleteMany({
        where: { orderId: params.id },
      });
      
      // 删除订单
      await tx.order.delete({
        where: { id: params.id },
      });
    });
    
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
