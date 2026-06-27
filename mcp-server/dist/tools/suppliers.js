import { z } from 'zod';
import prisma from '../db.js';
import { formatDate } from '../utils.js';
export const supplierTools = [
    {
        name: 'list_suppliers',
        description: '列出所有供应商，支持搜索、按合作状态/风险等级筛选',
        schema: {
            search: z.string().optional().describe('搜索关键词（名称、国家、产品）'),
            cooperationStatus: z.string().optional().describe('合作状态：potential, active, suspended, terminated'),
            riskLevel: z.string().optional().describe('风险等级：high, medium, low'),
            starred: z.boolean().optional().describe('仅显示收藏的供应商'),
            page: z.number().int().min(1).optional().default(1),
            pageSize: z.number().int().min(1).max(50).optional().default(20),
        },
        handler: async (args) => {
            const where = {};
            if (args.search) {
                where.OR = [
                    { name: { contains: args.search } },
                    { country: { contains: args.search } },
                    { mainProducts: { contains: args.search } },
                ];
            }
            if (args.cooperationStatus)
                where.cooperationStatus = args.cooperationStatus;
            if (args.riskLevel)
                where.riskLevel = args.riskLevel;
            if (args.starred)
                where.isStarred = true;
            const [suppliers, total] = await Promise.all([
                prisma.supplier.findMany({
                    where,
                    select: {
                        id: true, name: true, country: true, mainProducts: true, cooperationStatus: true,
                        riskLevel: true, isStarred: true, email: true, phone: true, orderAmount: true,
                        _count: { select: { products: true, contacts: true } },
                    },
                    skip: ((args.page || 1) - 1) * (args.pageSize || 20),
                    take: args.pageSize || 20,
                    orderBy: { updatedAt: 'desc' },
                }),
                prisma.supplier.count({ where }),
            ]);
            const statusMap = { potential: '潜在', active: '合作中', suspended: '暂停', terminated: '终止' };
            const riskMap = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' };
            const results = suppliers.map((s) => ({
                ID: s.id,
                名称: s.name,
                国家: s.country || '—',
                主要产品: s.mainProducts || '—',
                合作状态: statusMap[s.cooperationStatus] || s.cooperationStatus,
                风险等级: s.riskLevel ? riskMap[s.riskLevel] || s.riskLevel : '—',
                收藏: s.isStarred ? '⭐' : '',
                邮箱: s.email || '—',
                电话: s.phone || '—',
                产品数: s._count.products,
                联系人数: s._count.contacts,
            }));
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({ 总数: total, 当前页: args.page || 1, 供应商列表: results }, null, 2),
                    }],
            };
        },
    },
    {
        name: 'get_supplier',
        description: '获取单个供应商详细信息，包含联系人、产品、风险事件',
        schema: {
            supplierId: z.string().describe('供应商ID'),
        },
        handler: async (args) => {
            const supplier = await prisma.supplier.findUnique({
                where: { id: args.supplierId },
                include: {
                    contacts: { select: { id: true, name: true, position: true, email: true, phone: true, decisionWeight: true, communicationPreference: true } },
                    products: { select: { id: true, name: true, sku: true, price: true, stock: true }, take: 20 },
                    riskEvents: { select: { id: true, riskType: true, description: true, severity: true, occurredAt: true, resolvedAt: true }, orderBy: { occurredAt: 'desc' }, take: 10 },
                    _count: { select: { products: true, communications: true } },
                },
            });
            if (!supplier)
                return { content: [{ type: 'text', text: `❌ 未找到供应商 ID: ${args.supplierId}` }] };
            const info = {
                ID: supplier.id,
                名称: supplier.name,
                国家: supplier.country || '—',
                邮箱: supplier.email || '—',
                电话: supplier.phone || '—',
                网址: supplier.website || '—',
                地址: supplier.address || '—',
                主要产品: supplier.mainProducts || '—',
                合作状态: supplier.cooperationStatus,
                风险等级: supplier.riskLevel || '—',
                风险类型: supplier.riskTypes || '—',
                收藏: supplier.isStarred ? '是' : '否',
                备注: supplier.notes || '—',
                统计: { 产品数: supplier._count.products, 沟通记录: supplier._count.communications },
                联系人: supplier.contacts.map((c) => ({
                    姓名: c.name, 职位: c.position || '—', 邮箱: c.email || '—', 电话: c.phone || '—',
                    决策权重: c.decisionWeight || '—', 沟通偏好: c.communicationPreference || '—',
                })),
                产品: supplier.products.map((p) => ({ 名称: p.name, SKU: p.sku, 价格: p.price?.toString() || '—' })),
                风险事件: supplier.riskEvents.map((e) => ({
                    类型: e.riskType, 描述: e.description, 严重度: e.severity,
                    发生时间: formatDate(e.occurredAt), 解决时间: formatDate(e.resolvedAt),
                })),
            };
            return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
        },
    },
];
