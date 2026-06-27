import prisma from '../db.js';
import { formatCurrency } from '../utils.js';

export const dashboardTools = [
  {
    name: 'get_dashboard_stats',
    description: '获取系统仪表盘统计数据：客户、订单、产品、供应商、收入汇总，以及逾期跟进和库存预警',
    schema: {},
    handler: async () => {
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
          customerCount,
          activeCustomerCount,
          orderCount,
          pendingOrderCount,
          productCount,
          allProducts,
          supplierCount,
          activeSupplierCount,
          followUpCount,
          overdueFollowUpCount,
          monthlyRevenue,
          totalRevenue,
          recentOrders,
          recentFollowUps,
          customerByLevel,
        ] = await Promise.all([
          prisma.customer.count(),
          prisma.customer.count({ where: { status: 'active' } }),
          prisma.order.count(),
          prisma.order.count({ where: { status: 'pending' } }),
          prisma.product.count(),
          prisma.product.findMany({ select: { stock: true, minStock: true } }),
          prisma.supplier.count(),
          prisma.supplier.count({ where: { cooperationStatus: 'active' } }),
          prisma.followUp.count(),
          prisma.followUp.count({ where: { nextFollowUpDate: { lt: now }, status: { not: 'completed' } } }),
          prisma.order.aggregate({ _sum: { totalAmount: true }, where: { orderDate: { gte: monthStart } } }),
          prisma.order.aggregate({ _sum: { totalAmount: true } }),
          prisma.order.findMany({ take: 5, orderBy: { orderDate: 'desc' }, include: { customer: { select: { companyName: true } } } }),
          prisma.followUp.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            where: { status: 'in_progress' },
            include: { customer: { select: { companyName: true } } },
          }),
          prisma.customer.groupBy({ by: ['level'], _count: true }),
        ]);

        // 计算库存预警产品数
        const lowStockProductCount = allProducts.filter(p => p.stock <= p.minStock).length;

        const levelCounts: Record<string, number> = {};
        customerByLevel.forEach((item: { level: string | null; _count: number }) => {
          levelCounts[item.level || '未分级'] = item._count;
        });

        const stats = {
          客户: {
            总数: customerCount,
            活跃: activeCustomerCount,
            按等级: levelCounts,
          },
          订单: {
            总数: orderCount,
            待处理: pendingOrderCount,
            本月收入: formatCurrency(monthlyRevenue._sum.totalAmount ? Number(monthlyRevenue._sum.totalAmount) : null),
            累计收入: formatCurrency(totalRevenue._sum.totalAmount ? Number(totalRevenue._sum.totalAmount) : null),
            最近订单: recentOrders.map((o: Record<string, unknown>) => ({
              订单号: o.orderNo,
              客户: (o.customer as Record<string, unknown>).companyName,
              金额: formatCurrency(o.totalAmount as number),
              状态: o.status,
            })),
          },
          产品: {
            总数: productCount,
            库存预警: lowStockProductCount,
          },
          供应商: {
            总数: supplierCount,
            合作中: activeSupplierCount,
          },
          跟进: {
            总数: followUpCount,
            逾期未跟进: overdueFollowUpCount,
            最近需跟进: recentFollowUps.map((f: Record<string, unknown>) => ({
              客户: (f.customer as Record<string, unknown>).companyName,
              事项: f.followUpMatters,
              优先级: f.priority,
              下次跟进: f.nextFollowUpDate ? new Date(f.nextFollowUpDate as string).toISOString().split('T')[0] : '—',
            })),
          },
        };

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(stats, null, 2),
          }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: 'text' as const,
            text: `❌ 获取仪表盘数据失败: ${message}`,
          }],
          isError: true,
        };
      }
    },
  },
];
