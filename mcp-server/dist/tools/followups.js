import { z } from 'zod';
import prisma from '../db.js';
import { formatDate } from '../utils.js';
export const followUpTools = [
    {
        name: 'list_follow_ups',
        description: '列出跟进记录，支持按客户、状态、优先级筛选和逾期提醒',
        schema: {
            customerId: z.string().optional().describe('按客户ID筛选'),
            status: z.string().optional().describe('状态：in_progress, completed, archived'),
            priority: z.string().optional().describe('优先级：high, medium, low'),
            overdue: z.boolean().optional().describe('仅显示逾期未跟进的记录（nextFollowUpDate < 今天）'),
            page: z.number().int().min(1).optional().default(1),
            pageSize: z.number().int().min(1).max(50).optional().default(20),
        },
        handler: async (args) => {
            const where = {};
            if (args.customerId)
                where.customerId = args.customerId;
            if (args.status)
                where.status = args.status;
            if (args.priority)
                where.priority = args.priority;
            if (args.overdue) {
                where.nextFollowUpDate = { lt: new Date() };
                where.status = { not: 'completed' };
            }
            const [followUps, total] = await Promise.all([
                prisma.followUp.findMany({
                    where,
                    include: { customer: { select: { id: true, companyName: true } } },
                    skip: ((args.page || 1) - 1) * (args.pageSize || 20),
                    take: args.pageSize || 20,
                    orderBy: { nextFollowUpDate: 'asc' },
                }),
                prisma.followUp.count({ where }),
            ]);
            const priorityMap = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' };
            const results = followUps.map((f) => {
                const isOverdue = f.nextFollowUpDate && new Date(f.nextFollowUpDate) < new Date();
                const customerInfo = f.customer;
                return {
                    ID: f.id,
                    客户: customerInfo.companyName,
                    事项: f.followUpMatters,
                    联系方式: f.contactMethod,
                    优先级: priorityMap[f.priority] || f.priority,
                    状态: f.status,
                    阶段: f.stage || '—',
                    最近跟进: formatDate(f.lastFollowUpDate),
                    下次跟进: formatDate(f.nextFollowUpDate),
                    逾期: isOverdue ? '⚠️ 已逾期' : '正常',
                    备注: f.remarks || '—',
                    回复情感: f.replySentiment || '—',
                };
            });
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            总数: total, 当前页: args.page || 1,
                            逾期数: args.overdue ? total : followUps.filter((f) => f.nextFollowUpDate && new Date(f.nextFollowUpDate) < new Date()).length,
                            跟进列表: results,
                        }, null, 2),
                    }],
            };
        },
    },
    {
        name: 'create_follow_up',
        description: '创建新的客户跟进记录',
        schema: {
            customerId: z.string().describe('客户ID'),
            followUpMatters: z.string().describe('跟进事项，逗号分隔：开发,报价,样品,谈判,成交,其他'),
            contactMethod: z.enum(['电话', '邮件', 'WhatsApp', '微信', '其他']).describe('联系方式'),
            priority: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('优先级'),
            stage: z.string().optional().describe('跟进阶段'),
            remarks: z.string().optional().describe('备注'),
            nextFollowUpDate: z.string().optional().describe('下次跟进日期 (ISO格式)'),
        },
        handler: async (args) => {
            try {
                const followUp = await prisma.followUp.create({
                    data: {
                        customerId: args.customerId,
                        followUpMatters: args.followUpMatters,
                        contactMethod: args.contactMethod,
                        priority: args.priority || 'medium',
                        stage: args.stage,
                        lastFollowUpDate: new Date(),
                        nextFollowUpDate: args.nextFollowUpDate ? new Date(args.nextFollowUpDate) : undefined,
                        remarks: args.remarks,
                        status: 'in_progress',
                    },
                    include: { customer: { select: { companyName: true } } },
                });
                return {
                    content: [{
                            type: 'text',
                            text: `✅ 跟进记录创建成功！\n客户: ${followUp.customer.companyName}\n事项: ${followUp.followUpMatters}\n方式: ${followUp.contactMethod}\n优先级: ${followUp.priority}\n下次跟进: ${formatDate(followUp.nextFollowUpDate)}`,
                        }],
                };
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return { content: [{ type: 'text', text: `❌ 创建失败: ${message}` }] };
            }
        },
    },
    {
        name: 'update_follow_up',
        description: '更新跟进记录状态或内容',
        schema: {
            followUpId: z.string().describe('跟进记录ID'),
            status: z.enum(['in_progress', 'completed', 'archived']).optional(),
            priority: z.enum(['high', 'medium', 'low']).optional(),
            remarks: z.string().optional(),
            nextFollowUpDate: z.string().optional(),
            replySentiment: z.enum(['positive', 'neutral', 'negative']).optional().describe('AI回复情感分析'),
        },
        handler: async (args) => {
            try {
                const { followUpId, ...data } = args;
                const updateData = { ...data };
                if (args.nextFollowUpDate) {
                    updateData.nextFollowUpDate = new Date(args.nextFollowUpDate);
                }
                const followUp = await prisma.followUp.update({
                    where: { id: followUpId },
                    data: updateData,
                });
                return { content: [{ type: 'text', text: `✅ 跟进记录 ${followUp.id} 已更新` }] };
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return { content: [{ type: 'text', text: `❌ 更新失败: ${message}` }] };
            }
        },
    },
];
