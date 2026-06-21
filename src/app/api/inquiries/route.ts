import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fetchUnreadEmails } from '@/lib/email/imap-client';
import { detectLanguage } from '@/lib/email/inquiry-keywords';
import { extractInquiryPoints, generateReplyDraft, classifyEmail } from '@/lib/ai-siliconflow';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

function getUserIdFromCookie() {
  try {
    const token = require('next/headers').cookies().get('auth_token')?.value;
    if (!token) return null;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.userId || null;
  } catch { return null; }
}

// GET: 获取邮件列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { fromEmail: { contains: search } },
        { fromName: { contains: search } },
        { body: { contains: search } },
      ];
    }

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { customer: { select: { id: true, companyName: true } } },
      }),
      prisma.inquiry.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: inquiries, total, page, limit });
  } catch (error) {
    return NextResponse.json({ success: false, error: '获取邮件列表失败' }, { status: 500 });
  }
}

// 获取客户完整上下文（历史互动 + 备注 + 跟进记录）
async function getCustomerContext(customerId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      companyName: true, country: true, industry: true, level: true, notes: true,
      contacts: { select: { name: true, position: true }, take: 3 },
    },
  });
  if (!customer) return '';

  const recentFollowUps = await prisma.followUp.findMany({
    where: { customerId },
    orderBy: { lastFollowUpDate: 'desc' },
    take: 5,
    select: { contactMethod: true, nextAction: true, lastFollowUpDate: true },
  });

  let ctx = `公司: ${customer.companyName}`;
  if (customer.country) ctx += ` | ${customer.country}`;
  if (customer.industry) ctx += ` | ${customer.industry}`;
  if (customer.level) ctx += ` | ${customer.level}级`;
  if (customer.notes) ctx += `\n备注: ${customer.notes.slice(0, 300)}`;
  if (customer.contacts.length > 0) {
    ctx += '\n联系人: ' + customer.contacts.map(c =>
      c.position ? `${c.name}(${c.position})` : c.name
    ).join('; ');
  }
  if (recentFollowUps.length > 0) {
    ctx += '\n最近互动: ' + recentFollowUps.map(f =>
      `${new Date(f.lastFollowUpDate).toLocaleDateString('zh-CN')} ${f.contactMethod || '其他'} ${f.nextAction || ''}`
    ).join('\n');
  }
  return ctx;
}

// POST: 拉取邮件
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'sync') {
      const userId = getUserIdFromCookie();
      const config = await prisma.emailConfig.findFirst({
        where: { isActive: true, userId: userId || undefined },
      });
      if (!config) return NextResponse.json({ success: false, error: '请先配置邮箱' }, { status: 400 });

      // 同步半年内所有邮件（含已读）
      const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const allEmails = body.fullSync ?? true;
      const emails = await fetchUnreadEmails(
        { host: config.imapHost, port: config.imapPort, user: config.imapUser, password: config.imapPass },
        since, allEmails
      );

      let newCount = 0;
      for (const email of emails) {
        const exists = await prisma.inquiry.findUnique({ where: { messageId: email.messageId } });
        if (exists) continue;

        const language = detectLanguage(email.subject, email.body);

        // 匹配客户
        const customer = await prisma.customer.findFirst({
          where: { OR: [{ email: email.fromEmail }, { contacts: { some: { email: email.fromEmail } } }] },
        });

        // 获取客户完整上下文
        const customerContext = customer ? await getCustomerContext(customer.id) : '';

        // 创建邮件记录
        const inquiry = await prisma.inquiry.create({
          data: {
            emailConfigId: config.id,
            customerId: customer?.id || null,
            messageId: email.messageId,
            fromEmail: email.fromEmail,
            fromName: email.fromName,
            subject: email.subject,
            body: email.body,
            bodyHtml: email.bodyHtml,
            language,
            status: 'new',
          },
        });

        // 自动创建跟进记录
        if (customer) {
          await prisma.followUp.create({
            data: {
              customerId: customer.id,
              contactMethod: 'email',
              followUpMatters: '开发',
              nextAction: `收到邮件: ${email.subject.slice(0, 100)}`,
              priority: 'high',
              status: 'in_progress',
              lastFollowUpDate: new Date(),
            },
          });
        }

        // AI 处理
        try {
          const [points, tags] = await Promise.all([
            extractInquiryPoints(email.subject, email.body, language),
            classifyEmail(email.subject, email.body),
          ]);

          const customerInfo = customer
            ? `${customer.companyName} (${customer.country || ''}) - ${customer.industry || ''} [${customer.level || 'C'}级]`
            : '';

          const draft = await generateReplyDraft(
            email.subject, email.body, language, customerInfo, points, customerContext
          );

          await prisma.inquiry.update({
            where: { id: inquiry.id },
            data: {
              productInterested: points.productInterested,
              quantity: points.quantity,
              deliveryRequired: points.deliveryRequired,
              aiSummary: `[${tags.join(',')}] ${points.summary}`,
              aiDraftSubject: draft.subject,
              aiDraftBody: draft.body,
              status: 'processing',
            },
          });
        } catch (aiError) {
          console.error('AI processing error:', aiError);
        }
        newCount++;
      }

      await prisma.emailConfig.update({ where: { id: config.id }, data: { lastSyncAt: new Date() } });
      return NextResponse.json({ success: true, message: `成功拉取 ${newCount} 封新邮件`, created: newCount });
    }
    return NextResponse.json({ success: false, error: '不支持的操作' }, { status: 400 });
  } catch (error: any) {
    console.error('Sync error:', error?.message || error);
    return NextResponse.json({ success: false, error: `操作失败: ${error?.message || '未知错误'}` }, { status: 500 });
  }
}
