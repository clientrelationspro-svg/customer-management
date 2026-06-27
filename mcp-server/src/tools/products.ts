import { z } from 'zod';
import prisma from '../db.js';
import { formatCurrency, formatDate } from '../utils.js';

export const productTools = [
  {
    name: 'list_products',
    description: '列出所有产品，支持搜索（名称/SKU/描述）、分类筛选、库存预警',
    schema: {
      search: z.string().optional().describe('搜索关键词（名称、SKU、描述）'),
      category: z.string().optional().describe('产品分类'),
      status: z.string().optional().describe('状态：active, inactive'),
      lowStock: z.boolean().optional().describe('仅显示库存不足的产品'),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(50).optional().default(20),
    },
    handler: async (args: Record<string, unknown>) => {
      const where: Record<string, unknown> = {};
      if (args.search) {
        where.OR = [
          { name: { contains: args.search as string } },
          { sku: { contains: args.search as string } },
          { description: { contains: args.search as string } },
        ];
      }
      if (args.category) where.category = args.category;
      if (args.status) where.status = args.status;
      if (args.lowStock) {
        where.stock = { lte: prisma.product.fields.minStock };
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: { supplier: { select: { id: true, name: true } } },
          skip: ((args.page as number || 1) - 1) * (args.pageSize as number || 20),
          take: args.pageSize as number || 20,
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.product.count({ where }),
      ]);

      const results = products.map((p: Record<string, unknown>) => ({
        ID: p.id,
        名称: p.name,
        SKU: p.sku,
        分类: p.category || '—',
        售价: formatCurrency(p.price as number),
        成本: formatCurrency(p.cost as number),
        库存: p.stock,
        最低库存: p.minStock,
        状态: p.status,
        库存预警: (p.stock as number) <= (p.minStock as number) ? '⚠️ 库存不足' : '✅ 正常',
        供应商: (p.supplier as Record<string, unknown> | null)?.name || '—',
        描述: p.description || '—',
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ 总数: total, 当前页: args.page || 1, 产品列表: results }, null, 2),
        }],
      };
    },
  },
  {
    name: 'get_product',
    description: '获取单个产品详细信息',
    schema: {
      productId: z.string().describe('产品ID'),
    },
    handler: async (args: { productId: string }) => {
      const product = await prisma.product.findUnique({
        where: { id: args.productId },
        include: {
          supplier: { select: { id: true, name: true, phone: true, email: true } },
          orderItems: { take: 10, orderBy: { createdAt: 'desc' }, include: { order: { select: { orderNo: true, orderDate: true, customer: { select: { companyName: true } } } } } },
        },
      });

      if (!product) return { content: [{ type: 'text' as const, text: `❌ 未找到产品 ID: ${args.productId}` }] };

      const info = {
        ID: product.id,
        名称: product.name,
        SKU: product.sku,
        分类: product.category || '—',
        描述: product.description || '—',
        售价: formatCurrency(Number(product.price)),
        成本: formatCurrency(product.cost ? Number(product.cost) : null),
        毛利率: product.cost ? `${(((Number(product.price) - Number(product.cost)) / Number(product.price)) * 100).toFixed(1)}%` : '—',
        库存: product.stock,
        最低库存: product.minStock,
        状态: product.status,
        供应商: product.supplier ? { 名称: product.supplier.name, 邮箱: product.supplier.email, 电话: product.supplier.phone } : '无',
        最近订单: product.orderItems.map((oi: Record<string, unknown>) => ({
          订单号: (oi.order as Record<string, unknown>).orderNo, 客户: ((oi.order as Record<string, unknown>).customer as Record<string, unknown>).companyName, 日期: formatDate((oi.order as Record<string, unknown>).orderDate as string),
        })),
      };

      return { content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }] };
    },
  },
  {
    name: 'update_product_stock',
    description: '更新产品库存数量',
    schema: {
      productId: z.string().describe('产品ID'),
      stock: z.number().int().min(0).describe('新库存数量'),
    },
    handler: async (args: { productId: string; stock: number }) => {
      try {
        const product = await prisma.product.update({ where: { id: args.productId }, data: { stock: args.stock } });
        return { content: [{ type: 'text' as const, text: `✅ 产品 ${product.name} (${product.sku}) 库存已更新为: ${args.stock}` }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `❌ 更新失败: ${message}` }] };
      }
    },
  },
];
