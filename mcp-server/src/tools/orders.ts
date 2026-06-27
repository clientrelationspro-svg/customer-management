import { z } from 'zod';
import prisma from '../db.js';
import { formatDate, formatCurrency } from '../utils.js';

export const orderTools = [
  {
    name: 'list_orders',
    description: '列出所有订单，支持按状态、客户、日期范围筛选和分页',
    schema: {
      status: z.string().optional().describe('订单状态：pending, processing, shipped, delivered, cancelled'),
      customerId: z.string().optional().describe('客户ID筛选'),
      search: z.string().optional().describe('搜索订单号'),
      page: z.number().int().min(1).optional().default(1).describe('页码'),
      pageSize: z.number().int().min(1).max(50).optional().default(20).describe('每页数量'),
    },
    handler: async (args: { status?: string; customerId?: string; search?: string; page?: number; pageSize?: number }) => {
      const where: Record<string, unknown> = {};
      if (args.status) where.status = args.status;
      if (args.customerId) where.customerId = args.customerId;
      if (args.search) where.orderNo = { contains: args.search };

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            customer: { select: { id: true, companyName: true } },
            items: { select: { id: true, productId: true, quantity: true, totalPrice: true, product: { select: { name: true } } } },
          },
          skip: ((args.page || 1) - 1) * (args.pageSize || 20),
          take: args.pageSize || 20,
          orderBy: { orderDate: 'desc' },
        }),
        prisma.order.count({ where }),
      ]);

      const results = orders.map((o: Record<string, unknown>) => ({
        ID: o.id,
        订单号: o.orderNo,
        客户: (o.customer as Record<string, unknown>).companyName,
        状态: o.status,
        总金额: formatCurrency(o.totalAmount as number),
        已付金额: formatCurrency(o.paidAmount as number),
        产品数: (o.items as Array<Record<string, unknown>>).length,
        产品: (o.items as Array<Record<string, unknown>>).map((i: Record<string, unknown>) => `${(i.product as Record<string, unknown>).name} x${i.quantity}`),
        订单日期: formatDate(o.orderDate as string),
        交付日期: formatDate(o.deliveryDate as string),
        备注: o.notes || '—',
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ 总数: total, 当前页: args.page || 1, 订单列表: results }, null, 2),
        }],
      };
    },
  },
  {
    name: 'get_order',
    description: '获取单个订单的详细信息，包含订单项和客户信息',
    schema: {
      orderId: z.string().describe('订单ID'),
    },
    handler: async (args: { orderId: string }) => {
      const order = await prisma.order.findUnique({
        where: { id: args.orderId },
        include: {
          customer: { select: { id: true, companyName: true, email: true, phone: true, country: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true, price: true } } } },
        },
      });

      if (!order) return { content: [{ type: 'text' as const, text: `❌ 未找到订单 ID: ${args.orderId}` }] };

      const info = {
        ID: order.id,
        订单号: order.orderNo,
        客户: { 名称: order.customer.companyName, 邮箱: order.customer.email, 国家: order.customer.country },
        状态: order.status,
        总金额: formatCurrency(Number(order.totalAmount)),
        已付金额: formatCurrency(Number(order.paidAmount)),
        未付金额: formatCurrency(Number(order.totalAmount) - Number(order.paidAmount)),
        订单日期: formatDate(order.orderDate),
        交付日期: formatDate(order.deliveryDate),
        备注: order.notes || '—',
        订单项: order.items.map((i: Record<string, unknown>) => ({
          产品: (i.product as Record<string, unknown>).name,
          SKU: (i.product as Record<string, unknown>).sku,
          数量: i.quantity,
          单价: formatCurrency(i.unitPrice as number),
          小计: formatCurrency(i.totalPrice as number),
        })),
      };

      return { content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }] };
    },
  },
  {
    name: 'create_order',
    description: '创建新订单，需要客户ID和订单项列表',
    schema: {
      customerId: z.string().describe('客户ID'),
      items: z.array(z.object({
        productId: z.string().describe('产品ID'),
        quantity: z.number().int().min(1).describe('数量'),
        unitPrice: z.number().min(0).optional().describe('单价（不填则使用产品当前价格）'),
      })).describe('订单项列表'),
      status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional().default('pending'),
      notes: z.string().optional().describe('备注'),
      deliveryDate: z.string().optional().describe('预计交付日期 (ISO格式)'),
    },
    handler: async (args: {
      customerId: string;
      items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
      status?: string;
      notes?: string;
      deliveryDate?: string;
    }) => {
      try {
        const orderNo = `ORD${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const order = await prisma.$transaction(async (tx: any) => {
          let totalAmount = 0;
          const orderItems: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number }> = [];

          for (const item of args.items) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product) throw new Error(`产品 ${item.productId} 不存在`);
            if (product.stock < item.quantity) throw new Error(`产品 ${product.name} 库存不足 (当前: ${product.stock}, 需要: ${item.quantity})`);

            const unitPrice = item.unitPrice ?? Number(product.price);
            const totalPrice = unitPrice * item.quantity;
            totalAmount += totalPrice;

            orderItems.push({ productId: item.productId, quantity: item.quantity, unitPrice, totalPrice });

            await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
          }

          return tx.order.create({
            data: {
              orderNo,
              customerId: args.customerId,
              status: args.status || 'pending',
              totalAmount,
              notes: args.notes,
              deliveryDate: args.deliveryDate ? new Date(args.deliveryDate) : undefined,
              items: { create: orderItems },
            },
            include: { items: { include: { product: { select: { name: true } } } }, customer: { select: { companyName: true } } },
          });
        });

        return {
          content: [{
            type: 'text' as const,
            text: `✅ 订单创建成功！\n订单号: ${order.orderNo}\n客户: ${(order.customer as Record<string, unknown>).companyName}\n总金额: ${formatCurrency(order.totalAmount)}\n产品数: ${order.items.length}\n${order.items.map((i: Record<string, unknown>) => `  - ${(i.product as Record<string, unknown>).name} x${i.quantity}`).join('\n')}`,
          }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `❌ 创建订单失败: ${message}` }] };
      }
    },
  },
  {
    name: 'update_order_status',
    description: '更新订单状态',
    schema: {
      orderId: z.string().describe('订单ID'),
      status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).describe('新状态'),
    },
    handler: async (args: { orderId: string; status: string }) => {
      try {
        const order = await prisma.order.update({ where: { id: args.orderId }, data: { status: args.status } });
        return { content: [{ type: 'text' as const, text: `✅ 订单 ${order.orderNo} 状态已更新为: ${args.status}` }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `❌ 更新失败: ${message}` }] };
      }
    },
  },
];
