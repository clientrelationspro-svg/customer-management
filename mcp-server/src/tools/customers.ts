import { z } from 'zod';
import prisma from '../db.js';
import { formatDate, truncate } from '../utils.js';

/**
 * Customer tools for MCP server
 */
export const customerTools = [
  {
    name: 'list_customers',
    description: '列出所有客户，支持搜索（公司名称/邮箱/行业）、按等级和状态筛选，以及分页',
    schema: {
      search: z.string().optional().describe('搜索关键词（匹配公司名称、邮箱、行业）'),
      level: z.string().optional().describe('客户等级筛选：A, B, C, D, E'),
      status: z.string().optional().describe('客户状态：active, inactive'),
      page: z.number().int().min(1).optional().default(1).describe('页码，默认1'),
      pageSize: z.number().int().min(1).max(50).optional().default(20).describe('每页数量，默认20，最大50'),
    },
    handler: async (args: { search?: string; level?: string; status?: string; page?: number; pageSize?: number }) => {
      const { search, level, status, page = 1, pageSize = 20 } = args;
      const where: Record<string, unknown> = {};

      if (search) {
        where.OR = [
          { companyName: { contains: search } },
          { email: { contains: search } },
          { industry: { contains: search } },
          { country: { contains: search } },
        ];
      }
      if (level) where.level = level;
      if (status) where.status = status;

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          select: {
            id: true,
            companyName: true,
            country: true,
            industry: true,
            email: true,
            level: true,
            status: true,
            phone: true,
            createdAt: true,
            _count: { select: { orders: true, followUps: true } },
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.customer.count({ where }),
      ]);

      const results = customers.map((c: Record<string, unknown>) => ({
        id: c.id,
        公司名称: c.companyName,
        国家: c.country || '—',
        行业: c.industry || '—',
        邮箱: c.email || '—',
        电话: c.phone || '—',
        等级: c.level || '—',
        状态: c.status,
        订单数: (c._count as Record<string, number>).orders,
        跟进数: (c._count as Record<string, number>).followUps,
        创建时间: formatDate(c.createdAt as string),
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            总数: total,
            当前页: page,
            每页: pageSize,
            总页数: Math.ceil(total / pageSize),
            客户列表: results,
          }, null, 2),
        }],
      };
    },
  },

  {
    name: 'get_customer',
    description: '获取单个客户的详细信息，包含联系人、最近订单、跟进记录',
    schema: {
      customerId: z.string().describe('客户ID'),
    },
    handler: async (args: { customerId: string }) => {
      const customer = await prisma.customer.findUnique({
        where: { id: args.customerId },
        include: {
          contacts: { select: { id: true, name: true, position: true, email: true, phone: true, whatsapp: true } },
          orders: { take: 10, orderBy: { orderDate: 'desc' }, select: { id: true, orderNo: true, status: true, totalAmount: true, orderDate: true } },
          followUps: { take: 10, orderBy: { createdAt: 'desc' }, select: { id: true, followUpMatters: true, contactMethod: true, priority: true, status: true, lastFollowUpDate: true, nextFollowUpDate: true, stage: true, remarks: true } },
          needs: { select: { id: true, category: true, content: true, priority: true } },
          _count: { select: { orders: true, followUps: true, files: true } },
        },
      });

      if (!customer) {
        return { content: [{ type: 'text' as const, text: `❌ 未找到客户 ID: ${args.customerId}` }] };
      }

      const info: Record<string, unknown> = {
        ID: customer.id,
        公司名称: customer.companyName,
        国家: customer.country || '—',
        行业: customer.industry || '—',
        企业规模: customer.enterpriseScale || '—',
        地址: customer.address || '—',
        注册资本: customer.regCapital || '—',
        员工人数: customer.employeeCount || '—',
        成立日期: formatDate(customer.establishDate),
        邮箱: customer.email || '—',
        电话: customer.phone || '—',
        传真: customer.fax || '—',
        网址: customer.website || '—',
        社媒: customer.socialMedia || '—',
        等级: customer.level || '—',
        状态: customer.status,
        备注: customer.notes || '—',
        统计: {
          订单总数: customer._count.orders,
          跟进总数: customer._count.followUps,
          文件总数: customer._count.files,
        },
        联系人: customer.contacts.map((c: Record<string, unknown>) => ({
          姓名: c.name, 职位: c.position || '—', 邮箱: c.email || '—', 电话: c.phone || '—', WhatsApp: c.whatsapp || '—',
        })),
        最近订单: customer.orders.map((o: Record<string, unknown>) => ({
          订单号: o.orderNo, 状态: o.status, 金额: (o.totalAmount as { toString: () => string })?.toString() || '—', 日期: formatDate(o.orderDate as string),
        })),
        最近跟进: customer.followUps.map((f: Record<string, unknown>) => ({
          事项: f.followUpMatters, 方式: f.contactMethod, 优先级: f.priority, 阶段: f.stage || '—', 状态: f.status, 备注: truncate(f.remarks as string, 80),
        })),
        需求分析: customer.needs.map((n: Record<string, unknown>) => ({
          类别: n.category, 内容: n.content, 优先级: n.priority,
        })),
        创建时间: formatDate(customer.createdAt),
        更新时间: formatDate((customer as Record<string, unknown>).updatedAt as string),
      };

      return { content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }] };
    },
  },

  {
    name: 'create_customer',
    description: '创建新客户，需要公司名称，其他字段可选',
    schema: {
      companyName: z.string().min(1).describe('公司名称（必填）'),
      country: z.string().optional().describe('国家'),
      industry: z.string().optional().describe('行业'),
      email: z.string().email().optional().describe('邮箱'),
      phone: z.string().optional().describe('电话'),
      website: z.string().optional().describe('网址'),
      address: z.string().optional().describe('地址'),
      level: z.enum(['A', 'B', 'C', 'D', 'E']).optional().describe('客户等级'),
      notes: z.string().optional().describe('备注'),
    },
    handler: async (args: Record<string, unknown>) => {
      try {
        const customer = await prisma.customer.create({
          data: {
            companyName: args.companyName as string,
            country: args.country as string | undefined,
            industry: args.industry as string | undefined,
            email: args.email as string | undefined,
            phone: args.phone as string | undefined,
            website: args.website as string | undefined,
            address: args.address as string | undefined,
            level: args.level as string | undefined,
            notes: args.notes as string | undefined,
          },
        });
        return {
          content: [{
            type: 'text' as const,
            text: `✅ 客户创建成功！\nID: ${customer.id}\n公司名称: ${customer.companyName}\n等级: ${customer.level || 'C'}\n创建时间: ${formatDate(customer.createdAt)}`,
          }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `❌ 创建失败: ${message}` }] };
      }
    },
  },

  {
    name: 'update_customer',
    description: '更新客户信息，只需提供要修改的字段',
    schema: {
      customerId: z.string().describe('客户ID'),
      companyName: z.string().optional().describe('公司名称'),
      country: z.string().optional().describe('国家'),
      industry: z.string().optional().describe('行业'),
      email: z.string().email().optional().describe('邮箱'),
      phone: z.string().optional().describe('电话'),
      level: z.enum(['A', 'B', 'C', 'D', 'E']).optional().describe('客户等级'),
      status: z.enum(['active', 'inactive']).optional().describe('客户状态'),
      notes: z.string().optional().describe('备注'),
    },
    handler: async (args: Record<string, unknown>) => {
      try {
        const { customerId, ...data } = args;
        const customer = await prisma.customer.update({
          where: { id: customerId as string },
          data: data as Record<string, unknown>,
        });
        return {
          content: [{
            type: 'text' as const,
            text: `✅ 客户更新成功！\nID: ${customer.id}\n公司名称: ${customer.companyName}`,
          }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `❌ 更新失败: ${message}` }] };
      }
    },
  },

  {
    name: 'delete_customer',
    description: '删除客户（会级联删除关联的订单、跟进记录、联系人等）',
    schema: {
      customerId: z.string().describe('客户ID'),
    },
    handler: async (args: { customerId: string }) => {
      try {
        await prisma.customer.delete({ where: { id: args.customerId } });
        return { content: [{ type: 'text' as const, text: `✅ 客户 ${args.customerId} 已删除（含关联数据）` }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `❌ 删除失败: ${message}` }] };
      }
    },
  },
];
